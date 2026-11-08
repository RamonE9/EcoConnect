# EcoConnect Data Dictionary

PostgreSQL tables used by EcoConnect. The relationships between them are shown in [ERD.png](ERD.png) and described in [ERD.md](ERD.md).

**Key:** PK = primary key, FK = foreign key, UQ = unique. **Null:** whether the field can be left empty.

## 1. api_user

Residents, barangay officials and the system administrator.

| Field | Type | Key | Null | Description |
|---|---|---|---|---|
| id | bigint | PK | No | Unique user number |
| username | varchar(150) | UQ | No | Used to sign in |
| password | varchar(128) | | No | Hashed password (PBKDF2-SHA256) |
| first_name | varchar(150) | | No | First name |
| last_name | varchar(150) | | No | Last name |
| email | varchar(254) | | No | Email, also used to find the account |
| phone_number | varchar(20) | UQ | No | Mobile number, stored as +639XXXXXXXXX |
| role | varchar(20) | | No | `resident` or `admin` (barangay official) |
| barangay | varchar(50) | | Yes | The user's barangay |
| points | integer | | No | Current Eco-Points balance |
| peak_points | integer | | No | Highest balance ever reached; titles are based on this |
| title | varchar(50) | | Yes | Current achievement title |
| is_verified | boolean | | No | Valid ID approved by an official |
| id_image | varchar(500) | | Yes | Path to the valid ID photo (private storage) |
| profile_picture | varchar(500) | | Yes | Path to the profile photo |
| is_active | boolean | | No | Account enabled |
| is_staff | boolean | | No | Can open Django admin |
| is_superuser | boolean | | No | System administrator |
| last_login | timestamptz | | Yes | Last sign-in time |
| date_joined | timestamptz | | No | Account creation time |

## 2. api_event

Cleanup drives and other activities.

| Field | Type | Key | Null | Description |
|---|---|---|---|---|
| id | bigint | PK | No | Unique event number |
| title | varchar(100) | | No | Event name |
| description | text | | No | Details and what to bring |
| category | varchar(50) | | No | One of 7 types, e.g. Coastal Cleanup, Tree Planting |
| location | varchar(200) | | No | Place name or map coordinates |
| date | varchar(50) | | No | Event date |
| time | varchar(50) | | No | Start time |
| points_reward | integer | | No | Points each attendee earns (1–500) |
| max_participants | integer | | Yes | Participant limit; empty = no limit |
| barangay | varchar(50) | | Yes | Barangay hosting the event |
| status | varchar(20) | | No | `upcoming` or `completed` |
| completed_at | timestamptz | | Yes | When it was marked as done |
| organizer_id | bigint | FK → api_user | No | Official who created it |

## 3. api_participation

Who joined each event, and their ticket.

| Field | Type | Key | Null | Description |
|---|---|---|---|---|
| id | bigint | PK | No | Unique record number |
| user_id | bigint | FK → api_user | No | Resident who joined |
| event_id | bigint | FK → api_event | No | Event joined |
| checked_in_by_id | bigint | FK → api_user | Yes | Official who checked them in |
| status | varchar(20) | | No | `joined` or `attended` |
| ticket_code | varchar(8) | | Yes | Ticket code shown under the QR |
| attended_at | timestamptz | | Yes | Check-in time |
| checkin_method | varchar(10) | | Yes | `qr`, `code` or `manual` |
| verified_at | varchar(50) | | Yes | Check-in time as displayed text |

## 4. api_incentive

Rewards catalog for each barangay.

| Field | Type | Key | Null | Description |
|---|---|---|---|---|
| id | bigint | PK | No | Unique reward number |
| barangay | varchar(50) | | No | Barangay offering it |
| name | varchar(100) | | No | Item name, e.g. Rice 1kg |
| points_cost | integer | | No | Points per item |
| stock | integer | | No | Items left |
| max_per_claim | integer | | No | Most a resident can reserve at once |
| icon | varchar(10) | | No | Display emoji |
| is_active | boolean | | No | Shown to residents |

## 5. api_redemption

Reward reservations and pickups.

| Field | Type | Key | Null | Description |
|---|---|---|---|---|
| id | bigint | PK | No | Unique claim number |
| user_id | bigint | FK → api_user | No | Resident who reserved it |
| claimed_by_id | bigint | FK → api_user | Yes | Official who released it |
| item_name | varchar(100) | | No | Reward name at the time of the claim |
| quantity | integer | | No | Number of items |
| points_spent | integer | | No | Total points deducted |
| status | varchar(20) | | No | `Pending` (shown as Reserved), `Claimed` (Received) or `Rejected` (refunded) |
| timestamp | timestamptz | | No | When it was reserved |
| claim_code | varchar(8) | | Yes | Pickup code shown under the QR |
| claimed_at | timestamptz | | Yes | When it was handed over |

## 6. api_pointaward

Bonus points from officials.

| Field | Type | Key | Null | Description |
|---|---|---|---|---|
| id | bigint | PK | No | Unique award number |
| user_id | bigint | FK → api_user | No | Resident who received the points |
| awarded_by_id | bigint | FK → api_user | Yes | Official who gave them |
| points | integer | | No | Points given (1–500) |
| reason | varchar(255) | | No | Why the points were given |
| created_at | timestamptz | | No | When they were given |

## 7. api_transferrequest

Requests to move to another barangay.

| Field | Type | Key | Null | Description |
|---|---|---|---|---|
| id | bigint | PK | No | Unique request number |
| user_id | bigint | FK → api_user | No | Resident asking to move |
| source_barangay | varchar(50) | | No | Current barangay |
| target_barangay | varchar(50) | | No | Barangay they want to move to |
| reason | text | | Yes | Reason given |
| status | varchar(20) | | No | `Pending`, `Approved` or `Rejected` |
| created_at | timestamptz | | No | When it was sent |

## 8. api_otpstore

SMS verification codes.

| Field | Type | Key | Null | Description |
|---|---|---|---|---|
| id | bigint | PK | No | Unique code record |
| email | varchar(120) | | Yes | Account email the code belongs to |
| phone_number | varchar(20) | | Yes | Number the code was texted to |
| otp_code | varchar(6) | | No | 6-digit code |
| purpose | varchar(10) | | No | `signup` or `reset` |
| is_used | boolean | | No | Already used or replaced |
| created_at | timestamptz | | No | When it was sent; expires 10 minutes later |
