import { generateKeyPairSync } from "crypto";
import fs from "fs";

const { privateKey, publicKey } = generateKeyPairSync("ec", {
  namedCurve: "prime256v1",
  publicKeyEncoding: {
    type: "spki",
    format: "pem",
  },
  privateKeyEncoding: {
    type: "pkcs8",
    format: "pem",
  },
});

fs.writeFileSync("privy-server-key.pem", privateKey);
fs.writeFileSync("privy-server-key.pub", publicKey);

console.log("Privy server keys generated.");
