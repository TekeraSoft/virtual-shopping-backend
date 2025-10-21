# MongoDB Invitation Service API Test Examples

## 1. Create Invitation
```bash
curl -X POST http://localhost:3021/invitation/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "userId": "user1",
    "friendId": "user2"
  }'
```

## 2. Get Sent Invitations
```bash
curl -X GET http://localhost:3021/invitation/sent/user1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 3. Get Received Invitations
```bash
curl -X GET http://localhost:3021/invitation/received/user2 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 4. Accept Invitation
```bash
curl -X POST http://localhost:3021/invitation/accept \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "userId": "user2",
    "friendId": "user1"
  }'
```

## 5. Reject Invitation
```bash
curl -X POST http://localhost:3021/invitation/reject \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "userId": "user2",
    "friendId": "user1"
  }'
```

## 6. Get Mutual Invitations
```bash
curl -X GET http://localhost:3021/invitation/mutual/user1/user2 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 7. Get All Invitations (Admin)
```bash
curl -X GET "http://localhost:3021/invitation/all?limit=50&skip=0" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 8. Cleanup Expired Invitations
```bash
curl -X DELETE "http://localhost:3021/invitation/cleanup?days=30" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Database Schema
MongoDB collection: `invitations`

```json
{
  "_id": "ObjectId",
  "userId": "string",       // User who sent invitation
  "friendId": "string",     // User who received invitation
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

## Indexes
- Compound unique index: `{ userId: 1, friendId: 1 }`
- Single indexes: `{ userId: 1 }`, `{ friendId: 1 }`