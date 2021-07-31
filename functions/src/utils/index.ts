import moment from "moment-timezone";

export function momentFormat() {
  return moment(new Date())
    .tz("Asia/Ho_Chi_Minh")
    .format("YYYY/MM/DD HH:mm:ss");
}
export function log(message: string) {
  let res = "🔥🔥🔥🔥🔥🔥🔥🔥🔥";

  console.log("\n" + res);
  console.log("[" + momentFormat() + "]: " + message);
  console.log(res + "\n");
  return message;
}
