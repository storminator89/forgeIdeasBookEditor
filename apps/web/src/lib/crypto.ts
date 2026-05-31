import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) throw new Error("ENCRYPTION_KEY not set");
    return Buffer.from(key, "hex");
}

export function encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, getKey(), iv);
    const encrypted = Buffer.concat([
        cipher.update(plaintext, "utf8"),
        cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(ciphertext: string): string {
    const [ivHex, authTagHex, encryptedHex] = ciphertext.split(":");
    if (!ivHex || !authTagHex || !encryptedHex)
        throw new Error("Invalid ciphertext format");
    const decipher = createDecipheriv(
        ALGORITHM,
        getKey(),
        Buffer.from(ivHex, "hex")
    );
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    const decrypted = decipher.update(Buffer.from(encryptedHex, "hex"));
    return Buffer.concat([decrypted, decipher.final()]).toString("utf8");
}

export function isEncrypted(value: string): boolean {
    const parts = value.split(":");
    return (
        parts.length === 3 &&
        parts.every((p) => /^[0-9a-f]+$/i.test(p) && p.length > 0)
    );
}

export function decryptIfNeeded(value: string | null): string | null {
    if (!value) return null;
    return isEncrypted(value) ? decrypt(value) : value;
}
