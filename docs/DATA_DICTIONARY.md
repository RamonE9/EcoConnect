# EcoConnect Data Dictionary

PostgreSQL tables used by EcoConnect. Their relationships are shown in [ERD.png](ERD.png) and described in [ERD.md](ERD.md).

**Key:** PK = primary key, FK = foreign key (→ the table it links to), UQ = unique. **Null:** whether the field can be left empty.

## 1. barangays

Master list of barangays. Every user, event, reward and transfer points here.

| Field | Type | Key | Null | Description |
|---|---|---|---|---|
| id | bigint | PK | No | Unique record number |
| name | varchar(50) | UQ | No | Barangay name, e.g. Tiniguiban |
| city | varchar(60) |  | No | City or municipality |
| is_participating | boolean |  | No | Whether the barangay uses EcoConnect |
| created_at | timestamptz |  | No | When the record was created |

## 2. users

Residents, barangay officials and the system administrator.

| Field | Type | Key | Null | Description |
|---|---|---|---|---|
| id | bigint | PK | No | Unique record number |
| password | varchar(128) |  | No | Hashed password (PBKDF2-SHA256) |
| last_login | timestamptz |  | Yes | Last sign-in time |
| is_superuser | boolean |  | No | System administrator |
| username | varchar(150) | UQ | No | Used to sign in |
| first_name | varchar(150) |  | No | First name |
| last_name | varchar(150) |  | No | Last name |
| email | varchar(254) |  | No | Email, also used to find the account |
| is_staff | boolean |  | No | Can open Django admin |
| is_active | boolean |  | No | Account enabled |
| date_joined | timestamptz |  | No | Account creation time |
| phone_number | varchar(20) | UQ | No | Mobile number, stored as +639XXXXXXXXX |
| role | varchar(20) |  | No | `resident` or `admin` (barangay official) |
| barangay_id | bigint | FK → barangays | Yes | The user's barangay |
| points | integer |  | No | Current Eco-Points balance |
| peak_points | integer |  | No | Highest balance ever reached; titles are based on this |
| title | varchar(50) |  | Yes | Current achievement title |
| is_verified | boolean |  | No | Valid ID approved by an official |
| id_image | varchar(500) |  | Yes | Path to the valid ID photo (private storage) |
| profile_picture | varchar(500) |  | Yes | Path to the profile photo |

## 3. event_categories

Master list of event types, e.g. Coastal Cleanup, Tree Planting.

| Field | Type | Key | Null | Description |
|---|---|---|---|---|
| id | bigint | PK | No | Unique record number |
| name | varchar(50) | UQ | No | Category name |

## 4. events

Cleanup drives and other activities posted by a barangay.

| Field | Type | Key | Null | Description |
|---|---|---|---|---|
| id | bigint | PK | No | Unique record number |
| barangay_id | bigint | FK → barangays | No | Barangay hosting the event |
| organizer_id | bigint | FK → users | Yes | Official who created it |
| category_id | bigint | FK → event_categories | No | Type of event |
| title | varchar(100) |  | No | Event name |
| description | text |  | No | Details and what to bring |
| location | varchar(200) |  | No | Place name or map coordinates |
| date | date |  | No | Event date |
| time | time |  | No | Start time |
| points_reward | integer |  | No | Points each attendee earns (1-500) |
| max_participants | integer |  | Yes | Participant limit; empty = no limit |
| status | varchar(20) |  | No | `upcoming`, `completed` or `cancelled` |
| completed_at | timestamptz |  | Yes | When it was marked as done |
| created_at | timestamptz |  | No | When the record was created |

## 5. event_participants

Who joined each event, their ticket, and their check-in.

| Field | Type | Key | Null | Description |
|---|---|---|---|---|
| id | bigint | PK | No | Unique record number |
| user_id | bigint | FK → users | No | Resident who joined |
| event_id | bigint | FK → events | No | Event joined |
| checked_in_by_id | bigint | FK → users | Yes | Official who checked them in |
| status | varchar(20) |  | No | `joined` or `attended` |
| ticket_code | varchar(8) | UQ | Yes | Ticket code shown under the QR |
| joined_at | timestamptz |  | No | When the resident joined |
| attended_at | timestamptz |  | Yes | Check-in time |
| checkin_method | varchar(10) |  | Yes | `qr`, `code` or `manual` |

Rule: one row per user + event pair (unique together).

## 6. rewards

Rewards catalog of each barangay.

| Field | Type | Key | Null | Description |
|---|---|---|---|---|
| id | bigint | PK | No | Unique record number |
| barangay_id | bigint | FK → barangays | No | Barangay offering it |
| name | varchar(100) |  | No | Item name, e.g. Rice 1kg |
| points_cost | integer |  | No | Points per item |
| stock | integer |  | No | Items left |
| max_per_claim | integer |  | No | Most a resident can reserve at once |
| icon | varchar(10) |  | No | Display emoji |
| is_active | boolean |  | No | Shown to residents |
| created_at | timestamptz |  | No | When the record was created |

## 7. reward_claims

Rewards reserved by residents and their pickup.

| Field | Type | Key | Null | Description |
|---|---|---|---|---|
| id | bigint | PK | No | Unique record number |
| user_id | bigint | FK → users | No | Resident who reserved it |
| reward_id | bigint | FK → rewards | Yes | Reward reserved |
| claimed_by_id | bigint | FK → users | Yes | Official who released it |
| item_name | varchar(100) |  | No | Reward name at the time of the claim |
| quantity | integer |  | No | Number of items |
| points_spent | integer |  | No | Total points deducted |
| status | varchar(20) |  | No | `Pending` (Reserved), `Claimed` (Received) or `Rejected` (refunded) |
| claim_code | varchar(8) | UQ | Yes | Pickup code shown under the QR |
| timestamp | timestamptz |  | No | When it was reserved |
| claimed_at | timestamptz |  | Yes | When it was handed over |

## 8. point_awards

Bonus points given by officials.

| Field | Type | Key | Null | Description |
|---|---|---|---|---|
| id | bigint | PK | No | Unique record number |
| user_id | bigint | FK → users | No | Resident who received the points |
| awarded_by_id | bigint | FK → users | Yes | Official who gave them |
| points | integer |  | No | Points given (1-500) |
| reason | varchar(255) |  | No | Why the points were given |
| created_at | timestamptz |  | No | When the record was created |

## 9. transfer_requests

Requests to move a resident to another barangay.

| Field | Type | Key | Null | Description |
|---|---|---|---|---|
| id | bigint | PK | No | Unique record number |
| user_id | bigint | FK → users | No | Resident asking to move |
| source_barangay_id | bigint | FK → barangays | No | Current barangay |
| target_barangay_id | bigint | FK → barangays | No | Barangay they want to move to |
| decided_by_id | bigint | FK → users | Yes | Official who approved or rejected it |
| reason | text |  | Yes | Reason given |
| status | varchar(20) |  | No | `Pending`, `Approved` or `Rejected` |
| created_at | timestamptz |  | No | When the record was created |
| decided_at | timestamptz |  | Yes | When it was decided |

## 10. otp_codes

SMS verification codes for sign-up and password reset.

| Field | Type | Key | Null | Description |
|---|---|---|---|---|
| id | bigint | PK | No | Unique record number |
| user_id | bigint | FK → users | Yes | Account the code belongs to (password reset) |
| phone_number | varchar(20) |  | Yes | Number the code was texted to |
| email | varchar(120) |  | Yes | Email of the account or sign-up |
| otp_code | varchar(6) |  | No | 6-digit code |
| purpose | varchar(10) |  | No | `signup` or `reset` |
| is_used | boolean |  | No | Already used or replaced |
| created_at | timestamptz |  | No | When the record was created |
