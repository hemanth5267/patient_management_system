# Patient Management System

A web-based patient directory and dashboard backed by MySQL.

## Requirements

- Node.js and npm
- MySQL with a `hospital` database and a `patient` table containing `patient_id`, `patient_name`, `phone_number`, `email_id`, `address`, `problem`, and `room_no`

## Run locally

From this directory, install the dependencies and provide the database connection settings:

```sh
npm install
export DB_HOST=localhost
export DB_USER=root
export DB_PASSWORD=''
export DB_NAME=hospital
npm start
```

Open http://localhost:3000. Keep credentials in your environment; do not commit them to the repository.
