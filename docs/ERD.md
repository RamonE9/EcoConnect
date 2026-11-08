# EcoConnect Entity Relationship Diagram (ERD)

![EcoConnect ERD](ERD.png)

The image above ([ERD.png](ERD.png), vector version [ERD.svg](ERD.svg)) shows the 9 application tables in PostgreSQL with crow's-foot notation. Django's built-in tables (auth groups and permissions, sessions, admin log, content types, migrations) are left out because they belong to the framework, not to EcoConnect's design.

## Relationships

| Foreign key | References | Cardinality | Meaning |
| --- | --- | --- | --- |
| `api_event.organizer_id` | `api_user.id` | one user, many events | An official creates events |
| `api_participation.user_id` | `api_user.id` | one user, many participations | A resident joins events |
| `api_participation.event_id` | `api_event.id` | one event, many participations | An event has participants (each gets a ticket code) |
| `api_participation.checked_in_by_id` | `api_user.id` (nullable) | zero or one official | The official who scanned the ticket |
| `api_redemption.user_id` | `api_user.id` | one user, many claims | A resident reserves rewards |
| `api_redemption.claimed_by_id` | `api_user.id` (nullable) | zero or one official | The official who released the reward by scanning its QR |
| `api_pointaward.user_id` | `api_user.id` | one user, many awards | A resident receives bonus points |
| `api_pointaward.awarded_by_id` | `api_user.id` (nullable) | zero or one official | The official who gave the bonus |
| `api_transferrequest.user_id` | `api_user.id` | one user, many requests | A resident asks to move barangay |

## Design notes

* **Barangay** is stored as a name (`varchar(50)`) on users, events, rewards and expenses. The list of Puerto Princesa barangays is fixed in the app, so it has no table of its own.
* **Redemptions store the item name**, not a link to `api_incentive`, so a past claim stays readable even if the reward is later edited or removed.
* **`api_otpstore`** is matched by email or phone because a sign-up code is issued before the user record exists.
* **`api_expense`** exists in the database but has no screen yet.

## Mermaid source

```mermaid
erDiagram
    api_user ||--o{ api_event : creates
    api_user ||--o{ api_participation : joins
    api_event ||--o{ api_participation : has
    api_user o|--o{ api_participation : "checks in"
    api_user ||--o{ api_redemption : claims
    api_user o|--o{ api_redemption : releases
    api_user ||--o{ api_pointaward : receives
    api_user o|--o{ api_pointaward : gives
    api_user ||--o{ api_transferrequest : requests

    api_event {
        bigint id PK
        varchar title
        text description
        varchar category
        varchar location
        varchar date
        varchar time
        int points_reward
        int max_participants
        varchar barangay
        varchar status
        timestamptz completed_at
        bigint organizer_id FK
    }
    api_participation {
        bigint id PK
        bigint user_id FK
        bigint event_id FK
        bigint checked_in_by_id FK
        varchar status
        varchar ticket_code
        timestamptz attended_at
        varchar checkin_method
        varchar verified_at
    }
    api_user {
        bigint id PK
        varchar username UQ
        varchar password
        varchar first_name
        varchar last_name
        varchar email
        varchar phone_number UQ
        varchar role
        varchar barangay
        int points
        int peak_points
        varchar title
        boolean is_verified
        varchar id_image
        varchar profile_picture
        boolean is_active
        boolean is_staff
        boolean is_superuser
        timestamptz last_login
        timestamptz date_joined
    }
    api_redemption {
        bigint id PK
        bigint user_id FK
        bigint claimed_by_id FK
        varchar item_name
        int quantity
        int points_spent
        varchar status
        timestamptz timestamp
        varchar claim_code
        timestamptz claimed_at
    }
    api_pointaward {
        bigint id PK
        bigint user_id FK
        bigint awarded_by_id FK
        int points
        varchar reason
        timestamptz created_at
    }
    api_transferrequest {
        bigint id PK
        bigint user_id FK
        varchar source_barangay
        varchar target_barangay
        text reason
        varchar status
        timestamptz created_at
    }
    api_incentive {
        bigint id PK
        varchar barangay
        varchar name
        int points_cost
        int stock
        int max_per_claim
        varchar icon
        boolean is_active
    }
    api_otpstore {
        bigint id PK
        varchar email
        varchar phone_number
        varchar otp_code
        varchar purpose
        boolean is_used
        timestamptz created_at
    }
    api_expense {
        bigint id PK
        varchar barangay
        float amount
        varchar description
        varchar category
        varchar date
    }
```
