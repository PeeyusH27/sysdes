// @display-only: needs AWS credentials and a `shop` table
// DynamoDB: design around the access pattern "latest 20 orders for a user"
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export async function latestOrders(userId) {
  const { Items } = await ddb.send(new QueryCommand({
    TableName: 'shop',
    KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
    ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':prefix': 'ORDER#' },   // sk = ORDER#<ISO date>
    ScanIndexForward: false,                                                         // newest first
    Limit: 20,
  }));
  return Items;
}
