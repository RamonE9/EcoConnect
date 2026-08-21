# EcoConnect Entity Relationship Diagram (ERD)

This is a Mermaid diagram. If you are using VSCode, you can view this directly by installing the "Mermaid Preview" extension, or by opening this file on GitHub.

```mermaid
erDiagram
    User {
        int id PK
        string username
        string password
        string email
        string phone_number "UNIQUE"
        string role "resident, admin, superuser"
        int points
        string barangay
        string id_image
        string profile_picture
        boolean is_verified
        datetime date_joined
    }

    Event {
        int id PK
        string title
        text description
        string location
        string date
        string time
        int organizer_id FK
        int points_reward
        string barangay
        string status "upcoming, ongoing, completed"
    }

    Participation {
        int id PK
        int user_id FK
        int event_id FK
        string status "joined, verified"
        string verified_at
    }

    Redemption {
        int id PK
        int user_id FK
        string item_name
        int points_spent
        datetime timestamp
        string status "Pending, Claimed"
    }

    TransferRequest {
        int id PK
        int user_id FK
        string source_barangay
        string target_barangay
        text reason
        string status "Pending, Approved, Rejected"
        datetime created_at
    }

    Expense {
        int id PK
        string barangay
        float amount
        string description
        string category "Budget, Spent"
        string date
    }

    OTPStore {
        int id PK
        string phone_number
        string email
        string otp_code
        datetime created_at
        boolean is_used
    }

    %% Relationships
    User ||--o{ Event : "Organizes"
    User ||--o{ Participation : "Joins"
    Event ||--o{ Participation : "Has Participants"
    User ||--o{ Redemption : "Requests"
    User ||--o{ TransferRequest : "Submits"
```
