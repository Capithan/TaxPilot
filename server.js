import app from './dist/api/bridge.js';

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Tax Intake MCP Server running on port ${PORT}`);
});
