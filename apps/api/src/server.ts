import { app } from "./app";
import { startJobExpiryScheduler } from "./tasks/JobExpiryScheduler";

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Web app listening at http://localhost:${port}`);
  startJobExpiryScheduler();
});
