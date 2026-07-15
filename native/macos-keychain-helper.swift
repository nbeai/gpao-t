import Foundation
import Security

func finish(_ ok: Bool) -> Never {
  exit(ok ? 0 : 1)
}

guard CommandLine.arguments.count == 4 else { finish(false) }
let operation = CommandLine.arguments[1]
let service = CommandLine.arguments[2]
let account = CommandLine.arguments[3]
guard !service.isEmpty, !account.isEmpty else { finish(false) }

let base: [String: Any] = [
  kSecClass as String: kSecClassGenericPassword,
  kSecAttrService as String: service,
  kSecAttrAccount as String: account
]

switch operation {
case "save":
  var secret = FileHandle.standardInput.readDataToEndOfFile()
  if secret.last == 0x0A { secret.removeLast() }
  if secret.last == 0x0D { secret.removeLast() }
  guard secret.count >= 8, !secret.contains(0x0A), !secret.contains(0x0D) else { finish(false) }
  let update = SecItemUpdate(base as CFDictionary, [kSecValueData as String: secret] as CFDictionary)
  if update == errSecItemNotFound {
    var add = base
    add[kSecValueData as String] = secret
    finish(SecItemAdd(add as CFDictionary, nil) == errSecSuccess)
  }
  finish(update == errSecSuccess)
case "has":
  var query = base
  query[kSecMatchLimit as String] = kSecMatchLimitOne
  query[kSecReturnAttributes as String] = true
  finish(SecItemCopyMatching(query as CFDictionary, nil) == errSecSuccess)
case "read":
  var query = base
  query[kSecMatchLimit as String] = kSecMatchLimitOne
  query[kSecReturnData as String] = true
  var result: CFTypeRef?
  guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
        let secret = result as? Data,
        secret.count >= 8 else { finish(false) }
  FileHandle.standardOutput.write(secret)
  finish(true)
case "delete":
  finish(SecItemDelete(base as CFDictionary) == errSecSuccess)
default:
  finish(false)
}
