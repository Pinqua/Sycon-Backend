require("dotenv").config();
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

mongoose.connect(
  "mongodb+srv://PiyushSati:jXsOEExrxPeVeoSJ@cluster0.m0aq8.mongodb.net/myFirstDatabase?retryWrites=true&w=majority",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex: true,
  }
);
const connection = mongoose.connection;
connection
  .once("open", () => {
    console.log("Database connected...");
  })
  .catch((err) => {
    console.log("Connection failed...");
  });

app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.get("/", async (req, res) => {
  try {
    const documents = await Document.find();
    return res.json(documents);
  } catch (err) {
    console.log(err);
    return res.json(null);
  }
});

io.on("connection", (socket) => {
  socket.on("get-document", async (documentId) => {
    const document = await findOrCreateDocument(documentId);
    socket.join(documentId);
    socket.emit("load-document", document);

    socket.on("rename-document", async (name) => {
      try {
        await Document.findByIdAndUpdate(documentId, { name });
      } catch (err) {
        console.log(err);
      }
    });

    socket.on("send-changes", (delta) => {
      socket.broadcast.to(documentId).emit("receive-changes", delta);
    });

    socket.on("save-document", async (data) => {
      try {
        await Document.findByIdAndUpdate(documentId, { data });
      } catch (err) {
        console.log(err);
      }
    });
  });
  socket.on("delete-document", async (id) => {
    try {
      await Document.deleteOne({ _id: id });
    } catch (err) {
      console.log(err);
    }
  });
});

async function findOrCreateDocument(id) {
  if (id == null) return;
  try {
    const document = await Document.findById(id);
    if (document) return document;
    return await Document.create({
      _id: id,
      name: `Doc-${id}`,
      data: defaultValue,
    });
  } catch (err) {
    console.log(err);
  }
}

server.listen(PORT, function (err) {
  if (err) console.log(err);
  console.log("Server listening on PORT", PORT);
});
