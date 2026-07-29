"""
The SQLManager class manages database operations for visitor information and upload tasks.
It uses SQLite as the database backend

Key Responsibilities:
- Visitor Management: Stores, retrieves, updates, and deletes visitor information
- Upload Task Management: Tracks the status of file upload tasks.
- Notifications: Sends notifications to a webhook when new visitors are added

Interactions:
- Conversation Manager: Provides visitor information for workflows
- Webhook: Sends notifications to a configured webhook URL


**Event Handler**

The EventHandler class manages events and state for security checks.
It coordinates with the frontend to handle visitor data and liveness checks

Key Responsibilities:
- Security Check: Manages the state of security checks and their results.
- Event Management: Provides events for triggering and completing security operations.

Interactions:
- ChatSession: Coordinates security checks with the ChatSession to expose security events to frontend
- Frontend: Receives security check results from the frontend.

"""

import json
import requests
from sqlite3 import Connection
import hashlib
import uuid
from datetime import datetime, timezone
from app.core import WEBHOOK_CONFIG_PATH


class SQLManager:
    """
    SQLManager is a class that manages SQLite database operations for visitors' information
    """

    def __init__(self, connection: Connection):
        """
        Initialize the SQLManager with a database connection.

        Args:
            connection (Connection): SQLite database connection object.
        """
        self.connection = connection
        self.cursor = connection.cursor()
        self.initialize()

    def initialize(self):
        # Create the necessary tables if they do not exist.
        self.cursor.execute(
            """
        CREATE TABLE IF NOT EXISTS visitors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            dob TEXT NOT NULL,
            card_id TEXT,
            purpose TEXT,
            access_time TEXT NOT NULL,
            access_code TEXT UNIQUE NOT NULL,
            qr_hash TEXT NOT NULL
        )
        """
        )

        # Upload task table
        self.cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS upload_tasks (
                task_id TEXT PRIMARY KEY,
                file_name TEXT NOT NULL,
                file_type TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                status TEXT DEFAULT 'PENDING',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

        self.connection.commit()

        # Clean up any stale pending tasks from previous crashes
        self.__clear_stale_pending_tasks()

    def __clear_stale_pending_tasks(self):
        """
        Clear all pending upload tasks that are no longer needed.
        This is used to remove tasks that are stuck in 'PENDING' status.
        """
        self.cursor.execute("DELETE FROM upload_tasks WHERE status = 'PENDING'")
        self.connection.commit()

    def insert_upload_task(
        self, task_id: str, file_name: str, file_size: int, file_type: str, status: str
    ):
        """
        Insert a new upload task into the database.
        Args:
            task_id (str): The unique identifier for the task.
            file_name (str): The name of the file being uploaded.
            file_size (int): The size of the file being uploaded.
            file_type (str): The type of the file being uploaded.
            status (str): The status of the upload task (e.g., 'PENDING', 'SUCCESS', 'FAILURE').
        Raises:
            RuntimeError: If the insertion fails."""
        try:
            self.cursor.execute(
                """
                INSERT INTO upload_tasks (task_id, file_name, file_size, file_type, status)
                VALUES (?, ?, ?, ?, ?)
                """,
                (task_id, file_name, file_size, file_type, status),
            )
            self.connection.commit()
            print(f"Task '{task_id}' inserted with status '{status}'")
        except Exception as e:
            raise RuntimeError(f"Failed to insert task '{task_id}': {e}")

    def update_task_status(self, task_id: str, status: str):
        """
        Update the status of an upload task.
        Args:
            task_id (str): The ID of the task to update.
            status (str): The new status of the task.
        Raises:
            ValueError: If the task_id does not exist or update fails.
        """
        try:
            self.cursor.execute(
                "UPDATE upload_tasks SET status = ? WHERE task_id = ?",
                (status, task_id),
            )
            self.connection.commit()

            if self.cursor.rowcount == 0:
                raise ValueError(f"No task found with task_id '{task_id}'")

            print(f"Task '{task_id}' successfully updated to status '{status}'.")

        except Exception as e:
            raise RuntimeError(
                f"Failed to update task status for task_id '{task_id}': {e}"
            )

    def get_pending_upload_tasks(self):
        self.cursor.execute(
            "SELECT task_id, file_name, file_size, file_type, status FROM upload_tasks WHERE status = 'PENDING'"
        )
        rows = self.cursor.fetchall()
        return [dict(row) for row in rows]  # Convert to list of dictionaries

    def delete_success_tasks(self):
        """
        Delete all successful upload tasks.
        This is used to clear completed tasks from the task tracking table.
        Args:
            None
        """
        self.cursor.execute("DELETE FROM upload_tasks WHERE status = 'SUCCESS'")
        self.connection.commit()

    def get_upload_tasks(self):
        """
        Retrieve all upload tasks from the database.
        Returns:
            list: A list of tuples containing all upload tasks.
        """
        self.cursor.execute("SELECT * FROM upload_tasks")
        rows = self.cursor.fetchall()
        return [dict(row) for row in rows]  # Convert to list of dictionaries

    def generate_access_code(self):
        return str(uuid.uuid4()).split("-")[0].upper()  # e.g., "A1B2C3D4"

    def generate_qr_hash(self, card_id: str, access_code: str):
        raw = f"{card_id}_{access_code}_{datetime.now(timezone.utc).timestamp()}"
        return hashlib.sha256(raw.encode()).hexdigest()

    def insert_visitor(self, visitor_data: dict):
        """
        Store visitor information into the database.
        """
        try:
            print("[DEBUG] insert_visitor called with data:")
            for key, value in visitor_data.items():
                print(f" - {key}: {value}")

            access_code = self.generate_access_code()
            print(f"[DEBUG] Generated access_code: {access_code}")

            qr_hash = self.generate_qr_hash(visitor_data["card_id"], access_code)
            print(f"[DEBUG] Generated qr_hash: {qr_hash}")

            access_time = datetime.now(timezone.utc).isoformat()
            print(f"[DEBUG] Auto-generated access_time: {access_time}")
            self.cursor.execute(
                """
                INSERT INTO visitors (
                    name, dob, card_id, purpose, 
                    access_time, access_code, qr_hash
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    visitor_data["name"],
                    visitor_data["dob"],
                    visitor_data["card_id"],
                    visitor_data["purpose"],
                    access_time,
                    access_code,
                    qr_hash,
                ),
            )

            # Get the id of the newly inserted visitor
            visitor_data["id"] = self.cursor.lastrowid

            self.connection.commit()
            print("[DEBUG] Visitor inserted successfully into DB.")

            # Send notification to webhook for all connected clients
            try:
                self.send_notification(
                    visitor_data=visitor_data, access_code=access_code
                )
            except Exception as e:
                print(f"[ERROR] Failed to send notification: {e}")

            return {"access_code": access_code, "qr_hash": qr_hash}

        except KeyError as ke:
            print("[ERROR] Missing required field:", str(ke))
            raise RuntimeError(f"Missing required field: {ke}")

        except Exception as e:
            print("[ERROR] Failed to insert visitor:", str(e))
            raise RuntimeError(f"Failed to insert visitor: {e}")

    def send_notification(self, visitor_data: dict, access_code: str):
        """
        Send a notification to the webhook with visitor data.

        Args:
            visitor_data (dict): A dictionary containing visitor information.
        Raises:
            RuntimeError: If the notification fails to send.
            ValueError: If the visitor_data is missing required fields.
        """
        # Get the url and key from path
        with open(WEBHOOK_CONFIG_PATH, "r") as f:
            webhook_config = json.load(f)
            webhook_url = webhook_config.get("url", "")
            webhook_key = webhook_config.get("key", "")

        # Validate required fields
        required_fields = ["name", "dob", "purpose", "id"]
        for field in required_fields:
            if field not in visitor_data:
                raise ValueError(f"Missing required field: {field}")

        # Filter out data
        # We should only send name, dob and purpose for security reasons
        # Conver dob to serializable format
        if isinstance(visitor_data["dob"], datetime):
            # yyyy-mm-dd format
            visitor_data["dob"] = visitor_data["dob"].strftime("%Y-%m-%d")

        filtered_data = {
            "id": visitor_data["id"],
            "name": visitor_data["name"],
            "dob": visitor_data["dob"],
            "purpose": visitor_data["purpose"],
            "access_code": access_code,
        }

        headers = {"x-make-apikey": webhook_key}

        response = requests.post(
            webhook_url,
            json=filtered_data,
            headers=headers,
        )

        if response.status_code != 200:
            print(
                f"[ERROR] Failed to send notification: {response.status_code} - {response.text}"
            )
            raise RuntimeError(
                f"Failed to send notification: {response.status_code} - {response.text}"
            )
        print(
            f"[DEBUG] Notification sent successfully: {response.status_code} - {response.text}"
        )

    def get_all_visitors(self):
        self.cursor.execute("SELECT * FROM visitors")
        rows = self.cursor.fetchall()
        return [dict(row) for row in rows]

    def update_visitor_by_id(self, visitor_id: int, updated_data: dict):
        try:
            print(f"[DEBUG] update_visitor_by_id called for id: {visitor_id}")
            for key, value in updated_data.items():
                print(f" - Update {key}: {value}")

            columns = ", ".join(f"{key} = ?" for key in updated_data.keys())
            values = list(updated_data.values())
            values.append(visitor_id)

            query = f"UPDATE visitors SET {columns} WHERE id = ?"
            self.cursor.execute(query, values)

            if self.cursor.rowcount == 0:
                raise RuntimeError("Visitor not found or no changes made.")

            self.connection.commit()
            print("[DEBUG] Visitor updated successfully.")
            return {"status": "success", "message": "Visitor updated successfully."}

        except Exception as e:
            print("[ERROR] Failed to update visitor by id:", str(e))
            raise RuntimeError(f"Failed to update visitor by id: {e}")

    def delete_visitor_by_id(self, visitor_id: int):
        try:
            print(f"[DEBUG] delete_visitor_by_id called for id: {visitor_id}")
            self.cursor.execute("DELETE FROM visitors WHERE id = ?", (visitor_id,))

            if self.cursor.rowcount == 0:
                raise RuntimeError("Visitor not found.")

            self.connection.commit()
            print("[DEBUG] Visitor deleted successfully.")
            return {"status": "success", "message": "Visitor deleted successfully."}

        except Exception as e:
            print("[ERROR] Failed to delete visitor by id:", str(e))
            raise RuntimeError(f"Failed to delete visitor by id: {e}")
