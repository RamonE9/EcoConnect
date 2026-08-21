# EcoConnect

EcoConnect is a community-driven web application designed to track and gamify ecological activities within barangays. Residents can participate in cleanup drives and earn "Eco-Points," while local administrators can manage events, verify residents, and track community finance.

## 🛠️ Technology Stack

*   **Frontend**: React (with Vite), Tailwind CSS, Lucide React, React Leaflet
*   **Backend**: Flask (Python), SQLAlchemy, PyMySQL
*   **Database**: MySQL

---

## 🚀 Setup & Installation

### Prerequisites
Make sure you have the following installed on your machine:
*   [Node.js](https://nodejs.org/) (for the frontend)
*   [Python 3.x](https://www.python.org/) (for the backend)
*   [XAMPP](https://www.apachefriends.org/) or any local MySQL server.

### 1. Database Setup
1. Open XAMPP Control Panel and **Start the MySQL module**.
2. By default, the application connects to MySQL using the user `root` with no password on port `3306`.
3. If you need to change database credentials, edit the `SQLALCHEMY_DATABASE_URI` in `backend/config.py`.

### 2. Backend Setup
1. Open a terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   
   # Windows:
   venv\Scripts\activate
   # Mac/Linux:
   source venv/bin/activate
   ```
3. Install the required Python packages:
   ```bash
   pip install -r requirements.txt
   pip install pymysql
   ```
4. Initialize the database and create the default Admin account:
   ```bash
   python init_db.py
   ```
5. Run the Flask server:
   ```bash
   python app.py
   ```
   *The backend server will run on http://localhost:8000*

### 3. Frontend Setup
1. Open a new terminal and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install the Node.js dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend will typically run on http://localhost:5173*

### 4. Default Admin Login
Once the app is running, you can log in to the Admin Dashboard using:
*   **Username**: `Admin`
*   **Password**: `Admin`

---

## 🌟 Key Features
*   **Role-Based Dashboards**: Separate views and capabilities for Admins and Residents.
*   **Gamified Ecology**: Earn points for attending community cleanups.
*   **Points Redemption**: Use earned points to claim items or rewards.
*   **Geospatial Tracking**: View cleanup event locations via interactive maps.
*   **Inter-Barangay Transfer**: Request to move your account to a different barangay, subject to admin approval.
*   **Community Finance**: Admins can log and track budgets and expenses for environmental projects.
