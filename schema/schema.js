const { gql } = require("apollo-server-express");

// GraphQL Types
const typeDefs = gql`
  type User {
    id: ID!
    username: String!
  }

  type ConnectionRequest {
    sender: String!
    receiver: String!
    status: String!
  }

  type Message {
    senderId: String!
    receiverId: String!
    message: String!
    roomId: String!
    timestamp: String!
  }

  type Query {
    users: [User]
    messages(senderId: String!, receiverId: String!): [Message]
    latestMessages(userId: String!): [Message]
    connectionRequests(receiver: String!): [ConnectionRequest]
    acceptedConnections(userId: String!): [ConnectionRequest]
  }

  type Mutation {
    signup(username: String!, pin: String!): String
    login(username: String!, pin: String!): String
    sendRequest(sender: String!, receiver: String!): String
    handleRequest(sender: String!, receiver: String!, action: String!): String
    sendMessage(senderId: String!, receiverId: String!, message: String!, roomId: String!): Message
  }

  type Subscription {
    messageReceived(roomId: String!): Message
  }
`;

module.exports = { typeDefs };
