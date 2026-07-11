import app from './app';

// assign port number from env or use 3001
const PORT = process.env.PORT || 3001;

// start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});