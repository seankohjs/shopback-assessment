# Delivery Slot Management Service

This is a Next.js-based delivery slot management service with automatic slot assignment.

## Features

- **Strategy-based Slot Assignment**: The system automatically assigns delivery slots based on predefined strategies
- **Slot Capacity Management**: The system automatically tracks and manages the capacity usage of each time slot
- **Risk Assessment**: Includes risk assessment logic based on factors such as order amount and delivery time
- **Notification System**: Automatically sends notifications after order creation with delivery information

## System Architecture

- **Frontend**: Next.js (App Router)
- **Backend**: Node.js modular RESTful service
- **Database**: SQLite + TypeORM

## Project Structure

```
/app
  /api                  # API routes
    /order              # Order-related APIs
    /admin              # Admin APIs
/services               # Service modules
  /order                # Order-related services
  /delivery             # Delivery-related services
  /notification         # Notification services
  /fraud                # Risk assessment services
/models                 # Data models
  /entities             # TypeORM entity definitions
/utils                  # Utility functions
/types                  # TypeScript type definitions
/tests                  # Unit tests
```

## Installation and Usage

### Prerequisites

- Node.js 20+ (Use version in `.nvmrc`)
- npm or yarn

### Installation Steps

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up environment variables:
   ```
   cp .env.example .env
   ```
4. Initialize the database:
   ```
   npm run migrate
   ```
5. Insert seed data:
   ```
   npm run seed
   ```

### Run Development Environment

```
npm run dev
```

### Run Tests

```
npm test
```

## API Endpoints

### Order-related

- `POST /api/order/create`: Create a new order
- `GET /api/order/:id`: Get details of a single order
- `GET /api/order/user/:userId`: Get all orders for a user

### Admin-related

- `GET /api/admin/slots`: Get all delivery slots and their usage status
- `GET /api/admin/risk-alerts`: Get risk alerts
- `POST /api/admin/risk-alerts`: Manually trigger risk scanning

## Usage Example

### Create Order

```json
// POST /api/order/create
{
  "userId": 1,
  "addressId": 100,
  "items": [
    {
      "skuId": "SKU001",
      "qty": 2
    },
    {
      "skuId": "SKU002",
      "qty": 1
    }
  ]
}
```

## Assignment Instructions

This is a take-home assignment focusing on backend implementation. Please read the `PRD.md` file carefully, as it contains the requirements for implementing a new feature: **User-Selected Delivery Time Window**.

### Your Task

Currently, delivery slots are assigned automatically via a strategy pattern. Users have no control over their delivery time. Your task is to:

1. Implement the ability for users to select a preferred delivery slot during order placement
2. Add validation for the selected slot's availability
3. Implement fallback logic when a selected slot is full
4. Handle all related interdependencies across the codebase
