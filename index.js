// const express = require("express");
// const { createServer } = require("node:http");
// const path = require("node:path");
// const { Server } = require("socket.io");
// const mongoose = require("mongoose");
// const cors = require("cors");
// const bcrypt = require("bcrypt");
// const jwt = require("jsonwebtoken");

// const app = express();
// const httpServer = createServer(app); // Create an HTTP server

// // CORS middleware for Express
// const corsOptions = {
//   origin: "http://192.168.0.116:5173", // Allow requests from the frontend
//   methods: ["GET", "POST"],
//   allowedHeaders: ["Content-Type", "Authorization"], // Include Authorization header if using JWT
// };

// app.use(cors(corsOptions)); // Apply CORS middleware to the Express server

// const io = new Server(httpServer, {
//   cors: {
//     origin: "http://192.168.0.116:5173", // Allow requests from the frontend
//     methods: ["GET", "POST"],
//   },
// });

// const userSchema = new mongoose.Schema({
//   username: { type: String, unique: true, required: true },
//   pin: { type: String, required: true },
// });

// const connectionRequestSchema = new mongoose.Schema({
//     sender: { type: String, required: true },
//     receiver: { type: String, required: true },
//     status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
//   });

// const User = mongoose.model("User", userSchema);

// app.use(express.json()); // To parse JSON request bodies

// app.post("/signup", async (req, res) => {
//   const { username, pin } = req.body;

//   try {
//     // Check if the username already exists
//     const existingUser = await User.findOne({ username });
//     if (existingUser) {
//       return res.status(400).json({ error: "Username is already taken" });
//     }

//     // Hash the pin and save the new user
//     const hashedPin = await bcrypt.hash(pin, 10);
//     const newUser = new User({ username, pin: hashedPin });
//     await newUser.save();

//     res.status(201).json({ message: "User registered successfully" });
//   } catch (error) {
//     console.error("Error during signup:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

// // Login API
// app.post("/login", async (req, res) => {
//   const { username, pin } = req.body;
//   const user = await User.findOne({ username });
//   if (user && (await bcrypt.compare(pin, user.pin))) {
//     const token = jwt.sign({ username }, "secretKey");
//     res.status(200).json({ token, username });
//   } else {
//     res.status(400).json({ error: "Invalid username or pin" });
//   }
// });

// // User Listing API
// app.get("/users", async (req, res) => {
//   try {
//     const users = await User.find(); // Fetch all users from the database
//     res.status(200).json(users); // Send the list of users as the response
//   } catch (error) {
//     res.status(500).json({ error: "Failed to fetch users" });
//   }
// });

// app.get("/messages/:senderId/:receiverId", async (req, res) => {
//   const { senderId, receiverId } = req.params;
//   try {
//     const messages = await Message.find({
//       $or: [
//         { senderId, receiverId },
//         { senderId: receiverId, receiverId: senderId },
//       ],
//     });
//     res.json(messages);
//   } catch (err) {
//     res.status(500).json({ error: "Failed to fetch messages" });
//   }
// });

// app.get("/messages", async (req, res) => {
//   const { userId } = req.query; // Get userId from the query parameters

//   if (!userId) {
//     return res.status(400).json({ message: "userId is required" });
//   }

//   try {
//     // Fetch the latest messages for the given userId
//     const latestMessages = await Message.aggregate([
//       {
//         $match: {
//           $or: [
//             { senderId: userId }, // Filter by senderId
//             { receiverId: userId }, // Filter by receiverId
//           ],
//         },
//       },
//       {
//         $group: {
//           _id: {
//             $cond: {
//               if: { $eq: ["$senderId", userId] }, // If senderId is the userId
//               then: "$receiverId", // Group by receiverId
//               else: "$senderId", // Otherwise group by senderId
//             },
//           },
//           latestMessage: { $last: "$$ROOT" }, // Get the latest message for each user
//         },
//       },
//       {
//         $sort: { "latestMessage.timestamp": -1 }, // Sort by timestamp in descending order
//       },
//     ]);

//     // Send the response with the latest messages sorted by timestamp
//     res.json(latestMessages);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "An error occurred" });
//   }
// });

// let connectionRequests = [];

// // Send connection request
// app.post("/sendRequest", (req, res) => {
//   const { sender, receiver } = req.body;

//   // Check if request already exists
//   if (
//     connectionRequests.find(
//       (req) =>
//         (req.sender === sender && req.receiver === receiver) ||
//         (req.sender === receiver && req.receiver === sender)
//     )
//   ) {
//     return res.status(400).send("Request already sent.");
//   }

//   connectionRequests.push({ sender, receiver, status: "pending" });
//   res.status(200).send("Connection request sent.");
// });

// // Accept or decline request
// app.post("/handleRequest", (req, res) => {
//   const { sender, receiver, action } = req.body;

//   const requestIndex = connectionRequests.findIndex(
//     (req) => req.sender === sender && req.receiver === receiver
//   );

//   if (requestIndex !== -1) {
//     if (action === "accept") {
//       connectionRequests[requestIndex].status = "accepted";
//       res.status(200).send("Connection request accepted.");
//     } else if (action === "decline") {
//       connectionRequests.splice(requestIndex, 1);
//       res.status(200).send("Connection request declined.");
//     } else {
//       res.status(400).send("Invalid action.");
//     }
//   } else {
//     res.status(404).send("Connection request not found.");
//   }
// });

// // Fetch connection requests for a specific receiver
// app.get("/connectionRequests", (req, res) => {
//     const { receiver } = req.query;

//     if (!receiver) {
//       return res.status(400).json({ error: "Receiver is required" });
//     }

//     // Filter connection requests for the specific receiver
//     const requestsForReceiver = connectionRequests.filter(
//       (req) => req.receiver === receiver && req.status === "pending"
//     );

//     if (requestsForReceiver.length === 0) {
//       return res.status(404).json({ message: "No connection requests found" });
//     }

//     res.status(200).json(requestsForReceiver);
//   });

// // MongoDB Schema for Messages
// const messageSchema = new mongoose.Schema({
//   senderId: String,
//   receiverId: String,
//   message: String,
//   roomId: String, // Store roomId to associate messages with a specific room
//   timestamp: { type: Date, default: Date.now },
// });

// const Message = mongoose.model("Message", messageSchema);

// // MongoDB connection
// mongoose
//   .connect("mongodb+srv://okulr:okulr123@vishal.8zpf1.mongodb.net/chatApp", {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
//   })
//   .then(() => {
//     console.log("Connected to MongoDB");
//   })
//   .catch((err) => {
//     console.log("MongoDB connection error:", err);
//   });

// app.get("/", (req, res) => {
//   res.sendFile(path.join(__dirname, "index.html")); // Serve the HTML file
// });

// // Handle user connections
// io.on("connection", (socket) => {
//   let currentRoomId = null;

//   // When a user joins a room
//   socket.on("joinRoom", async ({ roomId }) => {
//     currentRoomId = roomId;
//     socket.join(roomId); // Join the room

//     // Fetch the initial chat history
//     fetchChatHistory(roomId, null); // null means we are fetching the latest messages
//   });

//   // Fetch chat history before a certain timestamp (pagination)
//   socket.on("fetch chat history", async ({ roomId, offset }) => {
//     await fetchChatHistory(roomId, offset);
//   });

//   // Helper function to fetch chat history
//   async function fetchChatHistory(roomId, offset) {
//     try {
//       const limit = offset !== null ? 2 : null; // Fetch all messages if no offset is provided
//       const query = { roomId };

//       let messages;
//       if (limit) {
//         // Fetch messages with pagination
//         messages = await Message.find(query)
//           .sort({ timestamp: -1 }) // Sort by timestamp descending (latest first)
//           .skip(offset) // Skip the first N messages
//           .limit(limit); // Fetch 'limit' number of messages
//       } else {
//         // Fetch all messages for the room
//         messages = await Message.find(query).sort({ timestamp: 1 }); // Ascending order for all
//       }

//       // Emit the chat history to the client
//       socket.emit("chat history", messages); // No need to reverse for ascending order
//     } catch (error) {
//       console.error("Error fetching chat history:", error);
//     }
//   }

//   // Handle sending a chat message
//   socket.on("chat message", async (data) => {
//     try {
//       const { senderId, receiverId, message, roomId } = data;

//       // Save the new message to the database
//       const newMessage = new Message({
//         senderId,
//         receiverId,
//         message,
//         roomId,
//         timestamp: new Date(),
//       });

//       await newMessage.save();

//       // Emit the new message to the room
//       io.to(roomId).emit("chat message", {
//         senderId,
//         message,
//         timestamp: newMessage.timestamp,
//       });
//       console.log(`Message emitted to room ${roomId}`);
//     } catch (error) {
//       console.error("Error saving chat message:", error);
//     }
//   });

//   // Handle leaving a room
//   socket.on("leaveRoom", ({ roomId }) => {
//     socket.leave(roomId); // Leave the room
//   });

//   // Handle typing indicator
//   socket.on("typing", (data) => {
//     socket.to(data.roomId).emit("typing", { userId: data.userId });
//   });
// });

// // Start the server
// // Start the server
// // Start the server
// const port = process.env.PORT || 3001;
// const host = "192.168.0.116"; // Your local network IP address

// httpServer.listen(port, host, () => {
//   console.log(`Server is running on http://${host}:${port}`);
// });

const express = require("express");
const { createServer } = require("node:http");
const path = require("node:path");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// App Initialization
const app = express();
const httpServer = createServer(app); // Create an HTTP server

// CORS Configuration
const corsOptions = {
  origin: "http://192.168.1.41:5173", // Frontend origin
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions)); // Apply CORS
app.use(express.json()); // Parse JSON request bodies

// Socket.IO Initialization
const io = new Server(httpServer, {
  cors: {
    origin: "http://192.168.1.41:5173",
    methods: ["GET", "POST"],
  },
});

// MongoDB Schemas
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  pin: { type: String, required: true },
});

const connectionRequestSchema = new mongoose.Schema({
  sender: { type: String, required: true },
  receiver: { type: String, required: true },
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending",
  },
});

const messageSchema = new mongoose.Schema({
  senderId: String,
  receiverId: String,
  message: String,
  roomId: String,
  timestamp: { type: Date, default: Date.now },
});

// MongoDB Models
const User = mongoose.model("User", userSchema);
const Message = mongoose.model("Message", messageSchema);

const ConnectionRequest = mongoose.model(
  "ConnectionRequest",
  connectionRequestSchema
);

async function getAcceptedConnectionsFromDb(userId) {
  try {
    // Query the database to find accepted connections for the user
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
  } catch (error) {
    console.error("Error fetching accepted connections: ", error);
    throw new Error("Could not retrieve accepted connections.");
  }
}

// MongoDB Connection
mongoose
  .connect(
    "mongodb+srv://shubhamrajputhot007:UL29gYnb2iWUFFGG@cluster0.yn6lr0e.mongodb.net/chatApp"
  )
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.log("MongoDB connection error:", err));

// User APIs
app.post("/signup", async (req, res) => {
  const { username, pin } = req.body;

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser)
      return res.status(400).json({ error: "Username is already taken" });

    const hashedPin = await bcrypt.hash(pin, 10);
    const newUser = new User({ username, pin: hashedPin });
    await newUser.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Error during signup:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/login", async (req, res) => {
  const { username, pin } = req.body;

  try {
    const user = await User.findOne({ username });
    if (user && (await bcrypt.compare(pin, user.pin))) {
      const token = jwt.sign({ username }, "secretKey");
      res.status(200).json({ token, username });
    } else {
      res.status(400).json({ error: "Invalid username or pin" });
    }
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/users", async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Connection Requests APIs
let connectionRequests = [];

app.post("/sendRequest", async (req, res) => {
  const { sender, receiver } = req.body;

  // Check if the sender and receiver are the same
  if (sender === receiver) {
    return res
      .status(400)
      .send("You cannot send a connection request to yourself.");
  }

  try {
    // Get the accepted connections for the sender
    const acceptedConnections = await getAcceptedConnectionsFromDb(sender);

    // Check if the sender already has an accepted connection with the receiver
    if (acceptedConnections.includes(receiver)) {
      return res.status(400).send("You are already connected with this user.");
    }

    // Check if there's already an existing request between the sender and receiver
    const existingRequest = await ConnectionRequest.findOne({
      $or: [
        { sender, receiver },
        { sender: receiver, receiver: sender },
      ],
    });

    if (existingRequest) {
      return res.status(400).send("Request already sent.");
    }

    // Save the new connection request in the database
    const newRequest = new ConnectionRequest({
      sender,
      receiver,
      status: "pending",
    });

    await newRequest.save();

    // Send a response indicating that the request was sent
    res.status(200).send("Connection request sent.");
  } catch (error) {
    console.error("Error sending connection request:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/handleRequest", async (req, res) => {
  const { sender, receiver, action } = req.body;

  // Validate input
  if (!sender || !receiver || !action) {
    return res.status(400).send("Sender, receiver, and action are required.");
  }

  try {
    // Find the connection request in the database
    const connectionRequest = await ConnectionRequest.findOne({
      sender,
      receiver,
    });

    if (!connectionRequest) {
      return res.status(404).send("Connection request not found.");
    }

    if (action === "accept") {
      // Update the status to "accepted"
      connectionRequest.status = "accepted";
      await connectionRequest.save();
      return res.status(200).send("Connection request accepted.");
    } else if (action === "decline") {
      // Remove the connection request from the database
      await ConnectionRequest.deleteOne({ sender, receiver });
      return res.status(200).send("Connection request declined.");
    } else {
      return res.status(400).send("Invalid action.");
    }
  } catch (error) {
    console.error("Error handling connection request:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/connectionRequests", async (req, res) => {
  const { receiver } = req.query;

  // Validate that the receiver is provided
  if (!receiver) {
    return res.status(400).json({ error: "Receiver is required" });
  }

  try {
    // Get the accepted connections for the receiver
    const acceptedConnections = await getAcceptedConnectionsFromDb(receiver);

    // Fetch pending requests for the receiver from the database
    const pendingRequests = await ConnectionRequest.find({
      receiver,
      status: "pending",
    });

    // Filter out requests from users who are already accepted connections
    const filteredRequests = pendingRequests.filter(
      (request) => !acceptedConnections.includes(request.sender)
    );

    if (filteredRequests.length === 0) {
      return res
        .status(404)
        .json({ message: "No pending connection requests found" });
    }

    res.status(200).json(filteredRequests);
  } catch (error) {
    console.error("Error fetching connection requests:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Message APIs
app.get("/messages/:senderId/:receiverId", async (req, res) => {
  const { senderId, receiverId } = req.params;

  try {
    const messages = await Message.find({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

app.get("/messages", async (req, res) => {
  const { userId } = req.query;

  if (!userId) return res.status(400).json({ message: "userId is required" });

  try {
    const latestMessages = await Message.aggregate([
      {
        $match: {
          $or: [{ senderId: userId }, { receiverId: userId }],
        },
      },
      {
        $group: {
          _id: {
            $cond: {
              if: { $eq: ["$senderId", userId] },
              then: "$receiverId",
              else: "$senderId",
            },
          },
          latestMessage: { $last: "$$ROOT" },
        },
      },
      { $sort: { "latestMessage.timestamp": -1 } },
    ]);

    res.json(latestMessages);
  } catch (error) {
    res.status(500).json({ message: "An error occurred" });
  }
});

// Add the missing route for accepted connections
app.get("/acceptedConnections", async (req, res) => {
  const { userId } = req.query;

  // Validate input
  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  try {
    // Query the database for accepted connections involving the user
    const acceptedConnections = await ConnectionRequest.find({
      $or: [
        { sender: userId, status: "accepted" },
        { receiver: userId, status: "accepted" },
      ],
    });

    if (acceptedConnections.length === 0) {
      return res.status(404).json({ message: "No accepted connections found" });
    }

    // Format the response to include the user IDs of the connections
    const formattedConnections = acceptedConnections.map((connection) => ({
      connectionId: connection._id,
      user:
        connection.sender === userId ? connection.receiver : connection.sender,
      status: connection.status,
    }));

    res.status(200).json(formattedConnections);
  } catch (error) {
    console.error("Error fetching accepted connections:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Socket.IO Handlers
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
        // Check if the connection request has been accepted
        const connection = connectionRequests.find(
          (req) =>
            (req.sender === senderId && req.receiver === receiverId) ||
            (req.sender === receiverId && req.receiver === senderId)
        );

        if (connection && connection.status !== "accepted") {
          // If connection request is not accepted, reject the message
          return socket.emit("error", {
            message:
              "You can only chat with users who have accepted your request.",
          });
        }

        // Save the message if the connection is accepted
        const newMessage = new Message({
          senderId,
          receiverId,
          message,
          roomId,
          timestamp: new Date(),
        });

        await newMessage.save();

        // Emit the message to the room if the connection is accepted
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

// Serve HTML
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start the Server
const port = process.env.PORT || 3001;
const host = "192.168.1.41";

httpServer.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}`);
});
