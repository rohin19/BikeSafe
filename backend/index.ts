import app from './app';

// assign port number from env or use 3001
const PORT = Number(process.env.PORT) || 3001;


// start the server
app.listen(PORT, "127.0.0.1", () => {
  console.log(`Server is running on http://127.0.0.1:${PORT}`);
});