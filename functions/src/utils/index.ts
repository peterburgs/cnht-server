import moment from "moment";

export function log(message: string) {
  let res = "🔥🔥🔥🔥🔥🔥🔥🔥🔥";
  const currentTime = moment(new Date()).format("HH:MM:SS");
  console.log("\n" + res);
  console.log("[" + currentTime + "]: " + message);
  console.log(res + "\n");
  return message;
}
export function momentFormat() {
  return moment(new Date()).format("YYYY/MM/DD HH:mm:ss");
}
