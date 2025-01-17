const express = require("express");
const { ApolloServer, gql } = require("apollo-server-express");
const { createServer } = require("node:http");
const path = require("node:path");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// App Initialization
const app = express();
const httpServer = createServer(app); // Create an HTTP server

// Socket.IO Initialization
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all origins for testing
    methods: ["GET", "POST"],
  },
});

// MongoDB Schemas
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  pin: { type: String, required: true },
});

const connectionRequestSchema = new mongoose.Schema({
    sender: { type: String, required: true },  // Change from ObjectId to String
    receiver: { type: String, required: true }, 
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending",
  },
});

const messageSchema = new mongoose.Schema({
  senderId: { type: String, required: true },
  receiverId: { type: String, required: true },
  message: { type: String, required: true },
  roomId: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

// MongoDB Models
const User = mongoose.model("User", userSchema);
const ConnectionRequest = mongoose.model(
  "ConnectionRequest",
  connectionRequestSchema
);
const Message = mongoose.model("Message", messageSchema);

// MongoDB Connection
mongoose.connect(
  "mongodb+srv://okulr:okulr123@vishal.8zpf1.mongodb.net/chatApp",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

// GraphQL Schema (Types and Resolvers)
const typeDefs = gql`
  type User {
    _id: ID!
    username: String!
  }

  type SignupResponse {
    success: Boolean
    message: String
  }

  type LoginResponse {
    username: String!
    message: String!
    success: Boolean!
  }

  type Message {
    senderId: String!
    receiverId: String!
    message: String!
    timestamp: String!
    roomId: String!
  }

  type ConnectionRequest {
    sender: String!
    receiver: ID!
    status: String!
  }

  type Query {
    users: [User]
    messages(senderId: String!, receiverId: String!): [Message]
    connectionRequests(receiver: ID!): [ConnectionRequest]
    acceptedConnections(userId: ID!): [User]
    getMessages(senderId: String!, receiverId: String!): [Message]
  }

  type Mutation {
    signup(username: String!, pin: String!): SignupResponse
    login(username: String!, pin: String!): LoginResponse
    sendConnectionRequest(sender: ID!, receiver: ID!): String
    handleConnectionRequest(
      sender: String!
      receiver: String!
      action: String!
    ): String

    sendMessage(
    senderId: String! 
    receiverId: String!
    message: String!
    roomId: String!
  ): Message!

    joinRoom(roomId: ID!): Boolean
  }
`;

// Function to fetch accepted connections
async function getAcceptedConnectionsFromDb(userId) {
  const acceptedConnections = await ConnectionRequest.find({
    $or: [
      { sender: userId, status: "accepted" },
      { receiver: userId, status: "accepted" },
    ],
  });

  // Extract and return the IDs of the accepted connections
  return acceptedConnections.map((connection) =>
    connection.sender === userId ? connection.receiver : connection.sender
  );
}

// Resolvers
const resolvers = {
  Query: {
    async users() {
      const users = await User.find();
      return users.map((user) => ({
        ...user.toObject(),
        _id: user._id.toString(), // Ensure _id is included as a string
      }));
    },
    async messages(_, { senderId, receiverId }) {
        return await Message.find({
          $or: [
            { senderId: senderId, receiverId: receiverId },
            { senderId: receiverId, receiverId: senderId },
          ],
        }).sort({ timestamp: 1 }); // Add sorting by timestamp to show messages in order
      }
      ,
    async connectionRequests(_, { receiver }) {
      try {
        // Step 1: Find the receiver user by username to get the ObjectId
        const receiverUser = await User.findOne({ username: receiver });
        if (!receiverUser) {
          throw new Error("Receiver user not found");
        }

        // Step 2: Use the receiver's ObjectId in the query
        return await ConnectionRequest.find({
          receiver: receiverUser._id,
          status: "pending",
        });
      } catch (error) {
        console.error(error);
        throw new Error("Failed to fetch connection requests");
      }
    },

    async acceptedConnections(_, { userId }) {
      try {
        // Step 1: Find the user by their username to get their ObjectId
        const user = await User.findOne({ username: userId });
        if (!user) {
          throw new Error("User not found");
        }

        // Step 2: Use the ObjectId in the query to fetch the connections
        const connections = await getAcceptedConnectionsFromDb(user._id); // Assuming this function uses ObjectId
        const userConnections = await User.find({
          _id: { $in: connections }, // Use _id, which is an ObjectId
        });

        // Step 3: Return the connections with the username and _id
        return userConnections.map((user) => ({
          _id: user._id.toString(), // Convert ObjectId to string
          username: user.username,
        }));
      } catch (error) {
        console.error(error);
        throw new Error("Failed to fetch accepted connections");
      }
    },

    getMessages: async (_, { senderId, receiverId }) => {
        try {
          const messages = await Message.find({
            $or: [
              { senderId, receiverId },
              { senderId: receiverId, receiverId: senderId },
            ],
          });
          return messages;
        } catch (error) {
          console.error("Error fetching messages:", error);
          throw new Error("Failed to fetch messages");
        }
      },
  },

  Mutation: {
    async signup(_, { username, pin }) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        throw new Error("Username already taken");
      }

      const hashedPin = await bcrypt.hash(pin, 10);
      const newUser = new User({ username, pin: hashedPin });
      await newUser.save();

      return {
        success: true,
        message: "User registered successfully",
      };
    },

    login: async (_, { username, pin }) => {
      const user = await User.findOne({ username });
      if (!user) {
        throw new Error("User not found");
      }

      const isValidPin = await bcrypt.compare(pin, user.pin);
      if (!isValidPin) {
        throw new Error("Invalid PIN");
      }

      return {
        username: user.username,
        message: "Login successful",
        success: true,
      };
    },

    sendConnectionRequest: async (parent, { sender, receiver }, context) => {
      try {
        // Step 1: Find the sender user by username
        const senderUser = await User.findOne({ username: sender });
        if (!senderUser) {
          throw new Error("Sender not found");
        }

        // Step 2: Find the receiver user by username
        const receiverUser = await User.findOne({ username: receiver });
        if (!receiverUser) {
          throw new Error("Receiver not found");
        }

        // Step 3: Create a new connection request with sender and receiver IDs (ObjectIds)
        const newConnectionRequest = new ConnectionRequest({
          sender: senderUser._id, // sender is now an ObjectId
          receiver: receiverUser._id, // receiver is now an ObjectId
          status: "pending",
        });

        // Step 4: Save the connection request to the database
        await newConnectionRequest.save();

        // Return a simple success message
        return "Connection request sent successfully"; // Returning a string instead of an object
      } catch (error) {
        // Handle errors (e.g., user not found, database issues, etc.)
        console.error(error);
        throw new Error("Failed to send connection request");
      }
    },

    async handleConnectionRequest(_, { sender, receiver, action }) {
      try {
        // Step 1: Find the receiver user by their username to get their ObjectId
        const receiverUser = await User.findOne({ username: receiver });
        if (!receiverUser) {
          throw new Error("Receiver user not found");
        }

        // Step 2: Use the ObjectId of the receiver user in the query
        const request = await ConnectionRequest.findOne({
          sender,
          receiver: receiverUser._id,
        });
        if (!request) {
          throw new Error("Request not found");
        }

        // Step 3: Handle the action (accept or decline)
        if (action === "accept") {
          request.status = "accepted";
        } else if (action === "decline") {
          request.status = "rejected";
        } else {
          throw new Error("Invalid action");
        }

        // Save the updated request
        await request.save();

        // Return a success message
        return `Connection request ${action}ed.`;
      } catch (error) {
        console.error(error);
        throw new Error("Failed to handle connection request");
      }
    },

    joinRoom: async (_, { roomId }, { socket }) => {
      try {
        console.log("Received roomId:", roomId);

        if (!roomId) {
          throw new Error("roomId is required");
        }

        // Join the room
        socket.join(roomId);
        console.log(`Socket ${socket.id} joined room: ${roomId}`);

        // Fetch the chat history
        const messages = await Message.find({ roomId })
          .sort({ timestamp: -1 })
          .limit(10);
        console.log("Fetched chat history:", messages);

        // Emit the chat history to the client
        socket.emit("chat history", messages);

        return true;
      } catch (error) {
        console.error("Error in joinRoom:", error.message || error);
        return false;
      }
    },
    async sendMessage(_, { senderId, receiverId, message, roomId }) {
      // Check if the connection exists
      const connection = await ConnectionRequest.findOne({
        $or: [
          { sender: senderId, receiver: receiverId },
          { sender: receiverId, receiver: senderId },
        ],
        status: "accepted",
      });

      if (!connection) {
        throw new Error(
          "You can only chat with users who have accepted your request."
        );
      }

      // Create the new message
      const newMessage = new Message({
        senderId,
        receiverId,
        message,
        roomId,
        timestamp: new Date(),
      });

      // Save the new message
      await newMessage.save();

      // Emit the new message to the room
      io.to(roomId).emit("chat message", {
        senderId,
        message,
        timestamp: newMessage.timestamp,
      });

      // Return the new message with selected fields
      return {
        senderId: newMessage.senderId,
        receiverId: newMessage.receiverId,
        message: newMessage.message,
        roomId: newMessage.roomId,
        timestamp: newMessage.timestamp,
      };
    },
  },
};

// Initialize Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const startServer = async () => {
  await server.start();
  server.applyMiddleware({ app });

  app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  });

  io.on("connection", (socket) => {
    let currentRoomId = null;

    socket.on("joinRoom", async ({ roomId }) => {
      currentRoomId = roomId;
      socket.join(roomId);
      fetchChatHistory(roomId, null);
    });

    socket.on("fetch chat history", async ({ roomId, offset }) => {
      fetchChatHistory(roomId, offset);
    });

    async function fetchChatHistory(roomId, offset) {
      try {
        const query = { roomId };
        const limit = offset !== null ? 2 : null;

        const messages = limit
          ? await Message.find(query)
              .sort({ timestamp: -1 })
              .skip(offset)
              .limit(limit)
          : await Message.find(query).sort({ timestamp: 1 });

        socket.emit("chat history", messages);
      } catch (error) {
        console.error("Error fetching chat history:", error);
      }
    }

    socket.on(
      "chat message",
      async ({ senderId, receiverId, message, roomId }) => {
        try {
          const connection = await ConnectionRequest.findOne({
            $or: [
              { sender: senderId, receiver: receiverId },
              { sender: receiverId, receiver: senderId },
            ],
            status: "accepted",
          });

          if (!connection) {
            return socket.emit("error", {
              message:
                "You can only chat with users who have accepted your request.",
            });
          }

          const newMessage = new Message({
            senderId,
            receiverId,
            message,
            roomId,
            timestamp: new Date(),
          });

          await newMessage.save();

          io.to(roomId).emit("chat message", {
            senderId,
            message,
            timestamp: newMessage.timestamp,
          });
        } catch (error) {
          console.error("Error saving chat message:", error);
          socket.emit("error", {
            message: "An error occurred while sending the message.",
          });
        }
      }
    );

    socket.on("leaveRoom", ({ roomId }) => {
      socket.leave(roomId);
    });

    socket.on("typing", ({ roomId, userId }) => {
      socket.to(roomId).emit("typing", { userId });
    });
  });

  const port = process.env.PORT || 3001;
  const host = "192.168.0.116";

  httpServer.listen(port, host, () => {
    console.log(
      `GraphQL server running at http://${host}:${port}${server.graphqlPath}`
    );
    console.log("Socket.IO server is also running.");
  });
};

startServer();
