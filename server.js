require("dotenv").config()
const mongoose = require("mongoose");
const Document = require("./models/Document");
const express = require("express");
const cors = require("cors");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
const PORT = process.env.PORT || 9000;
const defaultValue = "";

mongoose.connect(`${process.env.MONGO_CONNECTION_URL}`, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true,
});
const connection = mongoose.connection;
connection.once("open", () => {
    console.log("Database connected...");
  }).catch((err) => {
    console.log("Connection failed...");
});

app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.get("/", async (req, res) => {
  const documents = await Document.find();
  res.json(documents);
});

io.on("connection", (socket) => {
  socket.on("get-document", async (documentId) => {
    const document = await findOrCreateDocument(documentId);
    socket.join(documentId);
    socket.emit("load-document", document);

    socket.on("rename-document", async (name) => {
      await Document.findByIdAndUpdate(documentId, { name });
    });

    socket.on("send-changes", (delta) => {
      socket.broadcast.to(documentId).emit("receive-changes", delta);
    });

    socket.on("save-document", async (data) => {
      await Document.findByIdAndUpdate(documentId, { data });
    });
  });
  socket.on("delete-document", async (id) => {
    await Document.deleteOne({ _id: id });
  });
});

async function findOrCreateDocument(id) {
  if (id == null) return;

  const document = await Document.findById(id);
  if (document) return document;
  return await Document.create({
    _id: id,
    name: `Doc-${id}`,
    data: defaultValue,
  });
}

server.listen(PORT, function (err) {
  if (err) console.log(err);
  console.log("Server listening on PORT", PORT);
});
