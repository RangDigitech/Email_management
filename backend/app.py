from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from werkzeug.security import generate_password_hash, check_password_hash
import os
from dotenv import load_dotenv

# Load environment variables from the .env file
load_dotenv()

app = Flask(__name__)
CORS(app) 

# --- Database Connection Function ---
# A helper function to connect to the MySQL database.
def get_db_connection():
    try:
        conn = mysql.connector.connect(
            host=os.getenv('DB_HOST'),
            user=os.getenv('DB_USER'),
            password=os.getenv('DB_PASSWORD'),
            database=os.getenv('DB_NAME')
        )
        return conn
    except mysql.connector.Error as err:
        print(f"Error: {err}")
        return None

# --- Database bootstrap: ensure tables exist (campaigns vertical model) ---
def ensure_tables_exist():
    conn = get_db_connection()
    if conn is None:
        print('Unable to verify/create tables: database connection failed.')
        return

    cursor = conn.cursor()
    try:
        # Users table might already exist from signup/login. Create if missing (id auto-increment)
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) NOT NULL UNIQUE,
                email VARCHAR(255) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL
            ) ENGINE=InnoDB;
            """
        )

        # Base campaigns table (auto-increment id, FK to users)
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS campaigns (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                name VARCHAR(255) NOT NULL,
                topic VARCHAR(255) DEFAULT NULL,
                subtopic VARCHAR(255) DEFAULT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_campaigns_user
                    FOREIGN KEY (user_id) REFERENCES users(id)
                    ON DELETE CASCADE
            ) ENGINE=InnoDB;
            """
        )

        # Vertical list of sender emails per campaign
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS campaign_senders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                campaign_id INT NOT NULL,
                email VARCHAR(320) NOT NULL,
                CONSTRAINT fk_senders_campaign
                    FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
                    ON DELETE CASCADE,
                INDEX idx_sender_campaign (campaign_id)
            ) ENGINE=InnoDB;
            """
        )

        # Vertical list of recipient emails per campaign
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS campaign_recipients (
                id INT AUTO_INCREMENT PRIMARY KEY,
                campaign_id INT NOT NULL,
                email VARCHAR(320) NOT NULL,
                CONSTRAINT fk_recipients_campaign
                    FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
                    ON DELETE CASCADE,
                INDEX idx_recipient_campaign (campaign_id)
            ) ENGINE=InnoDB;
            """
        )

        # Per-user standalone lists (not tied to specific campaigns)
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS user_senders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                email VARCHAR(320) NOT NULL,
                list_name VARCHAR(255) NOT NULL DEFAULT 'Default',
                CONSTRAINT fk_user_senders_user
                    FOREIGN KEY (user_id) REFERENCES users(id)
                    ON DELETE CASCADE,
                UNIQUE KEY uniq_user_sender (user_id, email, list_name),
                INDEX idx_user_senders_user (user_id)
            ) ENGINE=InnoDB;
            """
        )

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS user_receivers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                email VARCHAR(320) NOT NULL,
                list_name VARCHAR(255) NOT NULL DEFAULT 'Default',
                CONSTRAINT fk_user_receivers_user
                    FOREIGN KEY (user_id) REFERENCES users(id)
                    ON DELETE CASCADE,
                UNIQUE KEY uniq_user_receiver (user_id, email, list_name),
                INDEX idx_user_receivers_user (user_id)
            ) ENGINE=InnoDB;
            """
        )

        # Backfill for older deployments: add list_name column if missing
        try:
            cursor.execute("SHOW COLUMNS FROM user_senders LIKE 'list_name'")
            if cursor.fetchone() is None:
                cursor.execute("ALTER TABLE user_senders ADD COLUMN list_name VARCHAR(255) NOT NULL DEFAULT 'Default'")
                cursor.execute("ALTER TABLE user_senders DROP INDEX uniq_user_sender")
                cursor.execute("ALTER TABLE user_senders ADD UNIQUE KEY uniq_user_sender (user_id, email, list_name)")
        except Exception:
            pass
        try:
            cursor.execute("SHOW COLUMNS FROM user_receivers LIKE 'list_name'")
            if cursor.fetchone() is None:
                cursor.execute("ALTER TABLE user_receivers ADD COLUMN list_name VARCHAR(255) NOT NULL DEFAULT 'Default'")
                cursor.execute("ALTER TABLE user_receivers DROP INDEX uniq_user_receiver")
                cursor.execute("ALTER TABLE user_receivers ADD UNIQUE KEY uniq_user_receiver (user_id, email, list_name)")
        except Exception:
            pass

        conn.commit()
    finally:
        cursor.close()
        conn.close()


def get_user_id_by_username(username: str):
    if not username:
        return None
    conn = get_db_connection()
    if conn is None:
        return None
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
        row = cursor.fetchone()
        return row[0] if row else None
    finally:
        cursor.close()
        conn.close()


# Ensure tables exist also when using Flask CLI (import-time)
try:
    ensure_tables_exist()
except Exception as e:
    print(f"Table initialization error: {e}")


def get_user_lists(user_id: int):
    conn = get_db_connection()
    if conn is None:
        return [], []
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT list_name, email FROM user_senders WHERE user_id = %s ORDER BY list_name, email", (user_id,))
        senders_rows = cursor.fetchall()
        senders_map = {}
        for list_name, email in senders_rows:
            senders_map.setdefault(list_name, []).append(email)

        cursor.execute("SELECT list_name, email FROM user_receivers WHERE user_id = %s ORDER BY list_name, email", (user_id,))
        receivers_rows = cursor.fetchall()
        receivers_map = {}
        for list_name, email in receivers_rows:
            receivers_map.setdefault(list_name, []).append(email)

        senders = [{ 'listName': k, 'emails': v } for k, v in senders_map.items()]
        receivers = [{ 'listName': k, 'emails': v } for k, v in receivers_map.items()]
        return senders, receivers
    finally:
        cursor.close()
        conn.close()

# --- API Endpoint for User Sign Up ---
@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.get_json()
    username = data['username']
    email = data['email']
    password = data['password']

    # Hash the password for security
    password_hash = generate_password_hash(password)

    conn = get_db_connection()
    if conn is None:
        return jsonify({'message': 'Database connection failed!'}), 500

    cursor = conn.cursor()

    try:
        # SQL query to insert the new user into the 'users' table
        query = "INSERT INTO users (username, email, password_hash) VALUES (%s, %s, %s)"
        cursor.execute(query, (username, email, password_hash))
        conn.commit()
        return jsonify({'message': 'User created successfully!'}), 201
    except mysql.connector.IntegrityError:
        # This error occurs if the username or email already exists (due to UNIQUE constraint)
        return jsonify({'message': 'Username or email already exists.'}), 409
    finally:
        cursor.close()
        conn.close()

# --- API Endpoint for User Login ---
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data['username']
    password = data['password']

    conn = get_db_connection()
    if conn is None:
        return jsonify({'message': 'Database connection failed!'}), 500
    
    # Use a dictionary cursor to get column names
    cursor = conn.cursor(dictionary=True)

    try:
        # SQL query to find the user by username
        query = "SELECT * FROM users WHERE username = %s"
        cursor.execute(query, (username,))
        user = cursor.fetchone()

        if user and check_password_hash(user['password_hash'], password):
            # If user exists and password is correct
            return jsonify({'message': 'Login successful!'}), 200
        else:
            # If user does not exist or password is incorrect
            return jsonify({'message': 'Invalid username or password.'}), 401
    finally:
        cursor.close()
        conn.close()

# --- API Endpoints for Campaigns (vertical storage) ---

@app.route('/api/campaigns', methods=['POST'])
def create_campaign():
    data = request.get_json()
    username = data.get('username')
    name = data.get('name')
    topic = data.get('topic')
    subtopic = data.get('subtopic')
    sender_emails = data.get('senderEmails') or []
    recipient_emails = data.get('recipientEmails') or []

    user_id = get_user_id_by_username(username)
    if not user_id:
        return jsonify({'message': 'User not found.'}), 404

    conn = get_db_connection()
    if conn is None:
        return jsonify({'message': 'Database connection failed!'}), 500
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO campaigns (user_id, name, topic, subtopic) VALUES (%s, %s, %s, %s)",
            (user_id, name, topic, subtopic)
        )
        campaign_id = cursor.lastrowid

        if sender_emails:
            cursor.executemany(
                "INSERT INTO campaign_senders (campaign_id, email) VALUES (%s, %s)",
                [(campaign_id, e) for e in sender_emails if e]
            )
        if recipient_emails:
            cursor.executemany(
                "INSERT INTO campaign_recipients (campaign_id, email) VALUES (%s, %s)",
                [(campaign_id, e) for e in recipient_emails if e]
            )
        conn.commit()

        return jsonify({
            'id': campaign_id,
            'name': name,
            'topic': topic,
            'subtopic': subtopic,
            'senderEmails': [e for e in sender_emails if e],
            'recipientEmails': [e for e in recipient_emails if e]
        }), 201
    finally:
        cursor.close()
        conn.close()


@app.route('/api/campaigns', methods=['GET'])
def list_campaigns():
    username = request.args.get('username')
    user_id = get_user_id_by_username(username)
    if not user_id:
        return jsonify({'message': 'User not found.'}), 404

    conn = get_db_connection()
    if conn is None:
        return jsonify({'message': 'Database connection failed!'}), 500
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id, name, topic, subtopic, created_at FROM campaigns WHERE user_id = %s ORDER BY created_at DESC",
            (user_id,)
        )
        campaigns = cursor.fetchall()

        if not campaigns:
            return jsonify([]), 200

        campaign_ids = [c['id'] for c in campaigns]

        # Fetch senders
        format_strings = ','.join(['%s'] * len(campaign_ids))
        cursor.execute(
            f"SELECT campaign_id, email FROM campaign_senders WHERE campaign_id IN ({format_strings})",
            tuple(campaign_ids)
        )
        senders_rows = cursor.fetchall()
        senders_map = {}
        for row in senders_rows:
            senders_map.setdefault(row['campaign_id'], []).append(row['email'])

        # Fetch recipients
        cursor.execute(
            f"SELECT campaign_id, email FROM campaign_recipients WHERE campaign_id IN ({format_strings})",
            tuple(campaign_ids)
        )
        recipients_rows = cursor.fetchall()
        recipients_map = {}
        for row in recipients_rows:
            recipients_map.setdefault(row['campaign_id'], []).append(row['email'])

        # Assemble
        result = []
        for c in campaigns:
            result.append({
                'id': c['id'],
                'name': c['name'],
                'topic': c['topic'],
                'subtopic': c['subtopic'],
                'createdAt': c['created_at'].isoformat() if c['created_at'] else None,
                'senderEmails': senders_map.get(c['id'], []),
                'recipientEmails': recipients_map.get(c['id'], [])
            })
        return jsonify(result), 200
    finally:
        cursor.close()
        conn.close()


@app.route('/api/campaigns/<int:campaign_id>', methods=['PUT'])
def update_campaign(campaign_id: int):
    data = request.get_json()
    username = data.get('username')
    name = data.get('name')
    topic = data.get('topic')
    subtopic = data.get('subtopic')
    sender_emails = data.get('senderEmails') or []
    recipient_emails = data.get('recipientEmails') or []

    user_id = get_user_id_by_username(username)
    if not user_id:
        return jsonify({'message': 'User not found.'}), 404

    conn = get_db_connection()
    if conn is None:
        return jsonify({'message': 'Database connection failed!'}), 500
    cursor = conn.cursor()
    try:
        # Verify ownership
        cursor.execute("SELECT user_id FROM campaigns WHERE id = %s", (campaign_id,))
        row = cursor.fetchone()
        if not row or row[0] != user_id:
            return jsonify({'message': 'Campaign not found.'}), 404

        # Update base fields
        cursor.execute(
            "UPDATE campaigns SET name = %s, topic = %s, subtopic = %s WHERE id = %s",
            (name, topic, subtopic, campaign_id)
        )

        # Replace senders/recipients
        cursor.execute("DELETE FROM campaign_senders WHERE campaign_id = %s", (campaign_id,))
        cursor.execute("DELETE FROM campaign_recipients WHERE campaign_id = %s", (campaign_id,))
        if sender_emails:
            cursor.executemany(
                "INSERT INTO campaign_senders (campaign_id, email) VALUES (%s, %s)",
                [(campaign_id, e) for e in sender_emails if e]
            )
        if recipient_emails:
            cursor.executemany(
                "INSERT INTO campaign_recipients (campaign_id, email) VALUES (%s, %s)",
                [(campaign_id, e) for e in recipient_emails if e]
            )
        conn.commit()

        return jsonify({'message': 'Campaign updated.'}), 200
    finally:
        cursor.close()
        conn.close()


@app.route('/api/campaigns/<int:campaign_id>', methods=['DELETE'])
def delete_campaign(campaign_id: int):
    username = request.args.get('username')
    user_id = get_user_id_by_username(username)
    if not user_id:
        return jsonify({'message': 'User not found.'}), 404

    conn = get_db_connection()
    if conn is None:
        return jsonify({'message': 'Database connection failed!'}), 500
    cursor = conn.cursor()
    try:
        # Verify ownership
        cursor.execute("SELECT user_id FROM campaigns WHERE id = %s", (campaign_id,))
        row = cursor.fetchone()
        if not row or row[0] != user_id:
            return jsonify({'message': 'Campaign not found.'}), 404

        cursor.execute("DELETE FROM campaigns WHERE id = %s", (campaign_id,))
        conn.commit()
        return jsonify({'message': 'Campaign deleted.'}), 200
    finally:
        cursor.close()
        conn.close()


# --- API Endpoints for per-user sender/receiver lists ---

@app.route('/api/lists', methods=['GET'])
def get_lists():
    username = request.args.get('username')
    user_id = get_user_id_by_username(username)
    if not user_id:
        return jsonify({'message': 'User not found.'}), 404
    senders, receivers = get_user_lists(user_id)
    return jsonify({'senders': senders, 'receivers': receivers}), 200


@app.route('/api/lists/list', methods=['PUT'])
def put_single_list():
    data = request.get_json()
    username = data.get('username')
    list_type = data.get('type')  # 'senders' or 'receivers'
    list_name = data.get('listName')
    emails = data.get('emails') or []

    if list_type not in ('senders', 'receivers'):
        return jsonify({'message': 'Invalid type.'}), 400
    if not list_name or not list_name.strip():
        return jsonify({'message': 'List name is required.'}), 400

    user_id = get_user_id_by_username(username)
    if not user_id:
        return jsonify({'message': 'User not found.'}), 404

    table = 'user_senders' if list_type == 'senders' else 'user_receivers'
    conn = get_db_connection()
    if conn is None:
        return jsonify({'message': 'Database connection failed!'}), 500
    cursor = conn.cursor()
    try:
        cursor.execute(f"DELETE FROM {table} WHERE user_id = %s AND list_name = %s", (user_id, list_name))
        if emails:
            cursor.executemany(
                f"INSERT INTO {table} (user_id, email, list_name) VALUES (%s, %s, %s)",
                [(user_id, e, list_name) for e in emails if e]
            )
        conn.commit()
        return jsonify({'message': 'List saved.'}), 200
    finally:
        cursor.close()
        conn.close()


@app.route('/api/lists/list', methods=['DELETE'])
def delete_single_list():
    username = request.args.get('username')
    list_type = request.args.get('type')
    list_name = request.args.get('listName')

    if list_type not in ('senders', 'receivers'):
        return jsonify({'message': 'Invalid type.'}), 400
    if not list_name:
        return jsonify({'message': 'List name required.'}), 400

    user_id = get_user_id_by_username(username)
    if not user_id:
        return jsonify({'message': 'User not found.'}), 404

    table = 'user_senders' if list_type == 'senders' else 'user_receivers'
    conn = get_db_connection()
    if conn is None:
        return jsonify({'message': 'Database connection failed!'}), 500
    cursor = conn.cursor()
    try:
        cursor.execute(f"DELETE FROM {table} WHERE user_id = %s AND list_name = %s", (user_id, list_name))
        conn.commit()
        return jsonify({'message': 'List deleted.'}), 200
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
