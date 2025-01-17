// const bcrypt = require("bcrypt");
// const jwt = require("jsonwebtoken");
// const User = require("../models/User");
// const Message = require("../models/Message");




// const resolvers = {
//   Query: {
//     users: async () => {
//       return await User.find();
//     },
//     messages: async (_, { senderId, receiverId }) => {
//       return await Message.find({
//         $or: [{ senderId, receiverId }, { senderId: receiverId, receiverId: senderId }],
//       });
//     },
//     latestMessages: async (_, { userId }) => {
//       return await Message.aggregate([
//         { $match: { $or: [{ senderId: userId }, { receiverId: userId }] } },
//         {
//           $group: {
//             _id: { $cond: { if: { $eq: ["$senderId", userId] }, then: "$receiverId", else: "$senderId" } },
//             latestMessage: { $last: "$$ROOT" },
//           },
//         },
//         { $sort: { "latestMessage.timestamp": -1 } },
//       ]);
//     },
//     connectionRequests: async (_, { receiver }) => {
//       return connectionRequests.filter((req) => req.receiver === receiver && req.status === "pending");
//     },
//     acceptedConnections: async (_, { userId }) => {
//       return connectionRequests.filter(
//         (req) => (req.sender === userId || req.receiver === userId) && req.status === "accepted"
//       );
//     },
//   },

//   Mutation: {
//     signup: async (_, { username, pin }) => {
//       const existingUser = await User.findOne({ username });
//       if (existingUser) {
//         throw new Error("Username is already taken");
//       }

//       const hashedPin = await bcrypt.hash(pin, 10);
//       const newUser = new User({ username, pin: hashedPin });
//       await newUser.save();
//       return "User registered successfully";
//     },

//     login: async (_, { username, pin }) => {
//       const user = await User.findOne({ username });
//       if (user && (await bcrypt.compare(pin, user.pin))) {
//         const token = jwt.sign({ username }, "secretKey");
//         return token;
//       }
//       throw new Error("Invalid username or pin");
//     },

//     sendRequest: (_, { sender, receiver }) => {
//       const existingRequest = connectionRequests.find(
//         (req) => (req.sender === sender && req.receiver === receiver) || (req.sender === receiver && req.receiver === sender)
//       );

//       if (existingRequest) {
//         throw new Error("Request already sent.");
//       }

//       connectionRequests.push({ sender, receiver, status: "pending" });
//       return "Connection request sent.";
//     },

//     handleRequest: (_, { sender, receiver, action }) => {
//       const requestIndex = connectionRequests.findIndex(
//         (req) => req.sender === sender && req.receiver === receiver
//       );

//       if (requestIndex === -1) {
//         throw new Error("Connection request not found.");
//       }

//       if (action === "accept") {
//         connectionRequests[requestIndex].status = "accepted";
//         return "Connection request accepted.";
//       } else if (action === "decline") {
//         connectionRequests.splice(requestIndex, 1);
//         return "Connection request declined.";
//       } else {
//         throw new Error("Invalid action.");
//       }
//     },

//     sendMessage: async (_, { senderId, receiverId, message, roomId }) => {
//       const connection = connectionRequests.find(
//         (req) => (req.sender === senderId && req.receiver === receiverId) || (req.sender === receiverId && req.receiver === senderId)
//       );

//       if (connection && connection.status !== "accepted") {
//         throw new Error("You can only chat with users who have accepted your request.");
//       }

//       const newMessage = new Message({
//         senderId,
//         receiverId,
//         message,
//         roomId,
//         timestamp: new Date(),
//       });

//       await newMessage.save();

//       return newMessage;
//     },
//   },

//   Subscription: {
//     messageReceived: {
//       subscribe: (_, { roomId }, { pubsub }) => {
//         return pubsub.asyncIterator([`messageReceived-${roomId}`]);
//       },
//     },
//   },
// };

// module.exports = { resolvers };
