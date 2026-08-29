#include <algorithm>
#include <array>
#include <atomic>
#include <cctype>
#include <chrono>
#include <csignal>
#include <cmath>
#include <cstdlib>
#include <cstring>
#include <ctime>
#include <filesystem>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <map>
#include <mutex>
#include <optional>
#include <sstream>
#include <stdexcept>
#include <string>
#include <thread>
#include <unordered_map>
#include <utility>
#include <vector>

#ifdef _WIN32
#include <windows.h>
#endif

#include "HCISUPAlarm.h"
#include "HCISUPCMS.h"

namespace {

std::atomic<bool> g_running{true};

void handleSignal(int) {
  g_running.store(false);
}

std::string trim(const std::string& value) {
  const auto first = value.find_first_not_of(" \t\r\n");
  if (first == std::string::npos) {
    return {};
  }
  const auto last = value.find_last_not_of(" \t\r\n");
  return value.substr(first, last - first + 1);
}

std::string lower(std::string value) {
  std::transform(value.begin(), value.end(), value.begin(), [](unsigned char ch) {
    return static_cast<char>(std::tolower(ch));
  });
  return value;
}

std::string normalizeDeviceCode(std::string value) {
  value = trim(std::move(value));
  std::string output;
  bool lastDash = false;
  for (unsigned char ch : value) {
    if (std::isalnum(ch)) {
      output.push_back(static_cast<char>(std::toupper(ch)));
      lastDash = false;
      continue;
    }
    if (ch == '-' || ch == '_' || ch == ' ' || ch == '.') {
      if (output.empty() || lastDash) {
        continue;
      }
      output.push_back('-');
      lastDash = true;
    }
  }
  while (!output.empty() && output.back() == '-') {
    output.pop_back();
  }
  return output;
}

std::string bytesToString(const void* data, size_t length) {
  if (data == nullptr || length == 0) {
    return {};
  }
  const auto* bytes = static_cast<const char*>(data);
  size_t actual = 0;
  while (actual < length && bytes[actual] != '\0') {
    ++actual;
  }
  return trim(std::string(bytes, actual));
}

void copyCString(char* destination, size_t capacity, const std::string& value) {
  if (destination == nullptr || capacity == 0) {
    return;
  }
  std::memset(destination, 0, capacity);
  const size_t length = std::min(capacity - 1, value.size());
  std::memcpy(destination, value.data(), length);
}

std::string jsonEscape(const std::string& value) {
  std::ostringstream output;
  output << '"';
  for (unsigned char ch : value) {
    switch (ch) {
      case '"':
        output << "\\\"";
        break;
      case '\\':
        output << "\\\\";
        break;
      case '\b':
        output << "\\b";
        break;
      case '\f':
        output << "\\f";
        break;
      case '\n':
        output << "\\n";
        break;
      case '\r':
        output << "\\r";
        break;
      case '\t':
        output << "\\t";
        break;
      default:
        if (ch < 0x20) {
          output << "\\u" << std::hex << std::setw(4) << std::setfill('0')
                 << static_cast<int>(ch) << std::dec << std::setfill(' ');
        } else {
          output << static_cast<char>(ch);
        }
        break;
    }
  }
  output << '"';
  return output.str();
}

class JsonValue {
 public:
  enum class Type { Null, Boolean, Number, String, Object, Array };

  Type type = Type::Null;
  bool booleanValue = false;
  double numberValue = 0;
  std::string stringValue;
  std::map<std::string, JsonValue> objectValue;
  std::vector<JsonValue> arrayValue;

  const JsonValue* find(const std::string& key) const {
    if (type != Type::Object) {
      return nullptr;
    }
    const auto it = objectValue.find(key);
    return it == objectValue.end() ? nullptr : &it->second;
  }

  std::string stringOr(const std::string& fallback = {}) const {
    return type == Type::String ? stringValue : fallback;
  }

  int integerOr(int fallback = 0) const {
    if (type != Type::Number) {
      return fallback;
    }
    return static_cast<int>(numberValue);
  }

  bool booleanOr(bool fallback = false) const {
    return type == Type::Boolean ? booleanValue : fallback;
  }
};

class JsonParser {
 public:
  explicit JsonParser(std::string source) : source_(std::move(source)) {}

  JsonValue parse() {
    skipWhitespace();
    JsonValue value = parseValue();
    skipWhitespace();
    if (position_ != source_.size()) {
      fail("unexpected trailing JSON data");
    }
    return value;
  }

 private:
  JsonValue parseValue() {
    skipWhitespace();
    if (position_ >= source_.size()) {
      fail("unexpected end of JSON");
    }
    switch (source_[position_]) {
      case '{':
        return parseObject();
      case '[':
        return parseArray();
      case '"': {
        JsonValue value;
        value.type = JsonValue::Type::String;
        value.stringValue = parseString();
        return value;
      }
      case 't':
        consumeLiteral("true");
        return boolean(true);
      case 'f':
        consumeLiteral("false");
        return boolean(false);
      case 'n':
        consumeLiteral("null");
        return JsonValue{};
      default:
        if (source_[position_] == '-' || std::isdigit(static_cast<unsigned char>(source_[position_]))) {
          JsonValue value;
          value.type = JsonValue::Type::Number;
          value.numberValue = parseNumber();
          return value;
        }
        fail("invalid JSON value");
    }
  }

  JsonValue parseObject() {
    expect('{');
    JsonValue value;
    value.type = JsonValue::Type::Object;
    skipWhitespace();
    if (consume('}')) {
      return value;
    }
    while (true) {
      skipWhitespace();
      if (position_ >= source_.size() || source_[position_] != '"') {
        fail("object key must be a string");
      }
      const std::string key = parseString();
      skipWhitespace();
      expect(':');
      value.objectValue.emplace(key, parseValue());
      skipWhitespace();
      if (consume('}')) {
        return value;
      }
      expect(',');
    }
  }

  JsonValue parseArray() {
    expect('[');
    JsonValue value;
    value.type = JsonValue::Type::Array;
    skipWhitespace();
    if (consume(']')) {
      return value;
    }
    while (true) {
      value.arrayValue.push_back(parseValue());
      skipWhitespace();
      if (consume(']')) {
        return value;
      }
      expect(',');
    }
  }

  std::string parseString() {
    expect('"');
    std::string result;
    while (position_ < source_.size()) {
      const char ch = source_[position_++];
      if (ch == '"') {
        return result;
      }
      if (ch != '\\') {
        result.push_back(ch);
        continue;
      }
      if (position_ >= source_.size()) {
        fail("unterminated JSON escape");
      }
      const char escaped = source_[position_++];
      switch (escaped) {
        case '"':
        case '\\':
        case '/':
          result.push_back(escaped);
          break;
        case 'b':
          result.push_back('\b');
          break;
        case 'f':
          result.push_back('\f');
          break;
        case 'n':
          result.push_back('\n');
          break;
        case 'r':
          result.push_back('\r');
          break;
        case 't':
          result.push_back('\t');
          break;
        case 'u':
          result += parseUnicodeEscape();
          break;
        default:
          fail("invalid JSON escape");
      }
    }
    fail("unterminated JSON string");
  }

  std::string parseUnicodeEscape() {
    if (position_ + 4 > source_.size()) {
      fail("short unicode escape");
    }
    unsigned int codePoint = 0;
    for (size_t index = 0; index < 4; ++index) {
      const char ch = source_[position_++];
      codePoint <<= 4;
      if (ch >= '0' && ch <= '9') {
        codePoint += static_cast<unsigned int>(ch - '0');
      } else if (ch >= 'a' && ch <= 'f') {
        codePoint += static_cast<unsigned int>(ch - 'a' + 10);
      } else if (ch >= 'A' && ch <= 'F') {
        codePoint += static_cast<unsigned int>(ch - 'A' + 10);
      } else {
        fail("invalid unicode escape");
      }
    }
    if (codePoint <= 0x7f) {
      return std::string(1, static_cast<char>(codePoint));
    }
    if (codePoint <= 0x7ff) {
      return std::string{
          static_cast<char>(0xc0 | (codePoint >> 6)),
          static_cast<char>(0x80 | (codePoint & 0x3f))};
    }
    return std::string{
        static_cast<char>(0xe0 | (codePoint >> 12)),
        static_cast<char>(0x80 | ((codePoint >> 6) & 0x3f)),
        static_cast<char>(0x80 | (codePoint & 0x3f))};
  }

  double parseNumber() {
    const size_t start = position_;
    if (consume('-')) {
      if (position_ >= source_.size()) {
        fail("invalid JSON number");
      }
    }
    if (consume('0')) {
      // A leading zero is valid only when the integer is exactly zero.
    } else {
      if (position_ >= source_.size() || !std::isdigit(static_cast<unsigned char>(source_[position_]))) {
        fail("invalid JSON number");
      }
      while (position_ < source_.size() && std::isdigit(static_cast<unsigned char>(source_[position_]))) {
        ++position_;
      }
    }
    if (consume('.')) {
      if (position_ >= source_.size() || !std::isdigit(static_cast<unsigned char>(source_[position_]))) {
        fail("invalid JSON fraction");
      }
      while (position_ < source_.size() && std::isdigit(static_cast<unsigned char>(source_[position_]))) {
        ++position_;
      }
    }
    if (position_ < source_.size() && (source_[position_] == 'e' || source_[position_] == 'E')) {
      ++position_;
      if (position_ < source_.size() && (source_[position_] == '+' || source_[position_] == '-')) {
        ++position_;
      }
      if (position_ >= source_.size() || !std::isdigit(static_cast<unsigned char>(source_[position_]))) {
        fail("invalid JSON exponent");
      }
      while (position_ < source_.size() && std::isdigit(static_cast<unsigned char>(source_[position_]))) {
        ++position_;
      }
    }
    try {
      return std::stod(source_.substr(start, position_ - start));
    } catch (const std::exception&) {
      fail("invalid JSON number");
    }
  }

  void skipWhitespace() {
    while (position_ < source_.size() && std::isspace(static_cast<unsigned char>(source_[position_]))) {
      ++position_;
    }
  }

  bool consume(char expected) {
    if (position_ < source_.size() && source_[position_] == expected) {
      ++position_;
      return true;
    }
    return false;
  }

  void expect(char expected) {
    if (!consume(expected)) {
      fail(std::string("expected '") + expected + "'");
    }
  }

  void consumeLiteral(const char* literal) {
    const size_t length = std::strlen(literal);
    if (source_.compare(position_, length, literal) != 0) {
      fail("invalid JSON literal");
    }
    position_ += length;
  }

  static JsonValue boolean(bool value) {
    JsonValue result;
    result.type = JsonValue::Type::Boolean;
    result.booleanValue = value;
    return result;
  }

  [[noreturn]] void fail(const std::string& message) const {
    throw std::runtime_error("JSON parse error at byte " + std::to_string(position_) + ": " + message);
  }

  std::string source_;
  size_t position_ = 0;
};

struct DeviceConfig {
  std::string deviceCode;
  std::string registrationId;
  std::string isupKey;
  int registrationPort = 7660;
  int alarmTcpPort = 7332;
  int alarmUdpPort = 7334;
  bool enabled = true;
  std::string deviceId;
  std::string serial;
};

struct BridgeConfig {
  std::string publicAddress;
  std::string alarmProtocol = "tcp";
  std::string timezoneOffset = "+08:00";
  std::string runtimeDir;
  std::string logDir;
  std::vector<DeviceConfig> devices;
};

std::string envOr(const char* name, const std::string& fallback = {}) {
  const char* value = std::getenv(name);
  return value == nullptr ? fallback : trim(value);
}

std::string expandEnvironmentVariables(const std::string& input) {
  std::string output;
  output.reserve(input.size());
  for (size_t position = 0; position < input.size();) {
    if (input[position] != '$' || position + 1 >= input.size() || input[position + 1] != '{') {
      output.push_back(input[position++]);
      continue;
    }
    const size_t closing = input.find('}', position + 2);
    if (closing == std::string::npos) {
      throw std::runtime_error("unterminated environment variable in gateway config");
    }
    const std::string variableName = input.substr(position + 2, closing - position - 2);
    if (variableName.empty()) {
      throw std::runtime_error("empty environment variable name in gateway config");
    }
    output += envOr(variableName.c_str());
    position = closing + 1;
  }
  return output;
}

void expandEnvironmentVariables(JsonValue& value) {
  switch (value.type) {
    case JsonValue::Type::String:
      value.stringValue = expandEnvironmentVariables(value.stringValue);
      return;
    case JsonValue::Type::Object:
      for (auto& [key, child] : value.objectValue) {
        (void)key;
        expandEnvironmentVariables(child);
      }
      return;
    case JsonValue::Type::Array:
      for (JsonValue& child : value.arrayValue) {
        expandEnvironmentVariables(child);
      }
      return;
    default:
      return;
  }
}

const JsonValue& requiredValue(const JsonValue& object, const std::string& key) {
  const JsonValue* value = object.find(key);
  if (value == nullptr) {
    throw std::runtime_error("missing JSON configuration field: " + key);
  }
  return *value;
}

std::string requiredString(const JsonValue& object, const std::string& key) {
  const JsonValue& value = requiredValue(object, key);
  if (value.type != JsonValue::Type::String) {
    throw std::runtime_error("configuration field must be a string: " + key);
  }
  return trim(value.stringValue);
}

std::string stringOr(const JsonValue& object, const std::string& key, const std::string& fallback = {}) {
  const JsonValue* value = object.find(key);
  if (value == nullptr || value->type == JsonValue::Type::Null) {
    return fallback;
  }
  if (value->type != JsonValue::Type::String) {
    throw std::runtime_error("configuration field must be a string: " + key);
  }
  return trim(value->stringValue);
}

int positiveIntOr(const JsonValue& object, const std::string& key, int fallback) {
  const JsonValue* value = object.find(key);
  if (value == nullptr || value->type == JsonValue::Type::Null) {
    return fallback;
  }
  if (value->type != JsonValue::Type::Number ||
      value->numberValue < 1 ||
      value->numberValue > 65535 ||
      std::floor(value->numberValue) != value->numberValue) {
    throw std::runtime_error("configuration field must be a port number: " + key);
  }
  return value->integerOr(fallback);
}

bool boolOr(const JsonValue& object, const std::string& key, bool fallback) {
  const JsonValue* value = object.find(key);
  return value == nullptr ? fallback : value->booleanOr(fallback);
}

BridgeConfig loadConfig(const std::string& path) {
  std::ifstream input(path, std::ios::binary);
  if (!input) {
    throw std::runtime_error("cannot open gateway config: " + path);
  }
  std::ostringstream contents;
  contents << input.rdbuf();
  JsonValue root = JsonParser(contents.str()).parse();
  expandEnvironmentVariables(root);

  BridgeConfig config;
  config.publicAddress = stringOr(root, "sdkBridgePublicAddress");
  config.alarmProtocol = lower(root.find("sdkBridgeAlarmProtocol") == nullptr
                                   ? "tcp"
                                   : root.find("sdkBridgeAlarmProtocol")->stringOr("tcp"));
  config.timezoneOffset = root.find("sdkBridgeTimezoneOffset") == nullptr
                              ? "+08:00"
                              : root.find("sdkBridgeTimezoneOffset")->stringOr("+08:00");
  config.runtimeDir = root.find("sdkBridgeRuntimeDir") == nullptr
                          ? envOr("HIKVISION_SDK_RUNTIME_DIR")
                          : root.find("sdkBridgeRuntimeDir")->stringOr();
  config.logDir = root.find("sdkBridgeLogDir") == nullptr
                      ? envOr("HIKVISION_SDK_LOG_DIR", "./runtime/sdk-log")
                      : root.find("sdkBridgeLogDir")->stringOr("./runtime/sdk-log");

  if (config.publicAddress.empty()) {
    config.publicAddress = envOr("ISUP_GATEWAY_PUBLIC_ADDRESS");
  }
  if (config.runtimeDir.empty()) {
    config.runtimeDir = envOr("HIKVISION_SDK_RUNTIME_DIR", "./vendor/lib64");
  }
  if (config.publicAddress.empty()) {
    throw std::runtime_error("sdkBridgePublicAddress or ISUP_GATEWAY_PUBLIC_ADDRESS is required");
  }
  if (config.alarmProtocol != "tcp" && config.alarmProtocol != "udp") {
    throw std::runtime_error("sdkBridgeAlarmProtocol must be tcp or udp");
  }

  const JsonValue* devices = root.find("devices");
  if (devices == nullptr || devices->type != JsonValue::Type::Array || devices->arrayValue.empty()) {
    throw std::runtime_error("gateway config must contain at least one device");
  }
  for (const JsonValue& rawDevice : devices->arrayValue) {
    DeviceConfig device;
    device.deviceCode = normalizeDeviceCode(requiredString(rawDevice, "deviceCode"));
    if (device.deviceCode.empty()) {
      throw std::runtime_error("deviceCode must contain at least one ASCII letter or digit");
    }
    device.registrationId = stringOr(rawDevice, "registrationId", device.deviceCode);
    if (device.registrationId.empty()) {
      device.registrationId = device.deviceCode;
    }
    device.isupKey = requiredString(rawDevice, "isupKey");
    device.registrationPort = positiveIntOr(rawDevice, "registrationPort", 7660);
    device.alarmTcpPort = positiveIntOr(rawDevice, "alarmTcpPort", 7332);
    device.alarmUdpPort = positiveIntOr(rawDevice, "alarmUdpPort", 7334);
    device.enabled = boolOr(rawDevice, "enabled", true);
    if (device.enabled && device.isupKey.empty()) {
      throw std::runtime_error("enabled device is missing isupKey: " + device.deviceCode);
    }
    config.devices.push_back(std::move(device));
  }

  const DeviceConfig* shared = nullptr;
  for (const DeviceConfig& device : config.devices) {
    if (!device.enabled) {
      continue;
    }
    if (shared == nullptr) {
      shared = &device;
      continue;
    }
    if (shared->registrationPort != device.registrationPort ||
        shared->alarmTcpPort != device.alarmTcpPort ||
        shared->alarmUdpPort != device.alarmUdpPort) {
      throw std::runtime_error(
          "enabled devices must share registrationPort, alarmTcpPort and alarmUdpPort for one native SDK process");
    }
  }
  return config;
}

std::string localName(std::string name) {
  const auto separator = name.find(':');
  if (separator != std::string::npos) {
    name = name.substr(separator + 1);
  }
  return lower(name);
}

std::string decodeXmlEntities(std::string value) {
  const std::pair<const char*, const char*> replacements[] = {
      {"&lt;", "<"}, {"&gt;", ">"}, {"&amp;", "&"}, {"&quot;", "\""}, {"&apos;", "'"}};
  for (const auto& replacement : replacements) {
    size_t position = 0;
    while ((position = value.find(replacement.first, position)) != std::string::npos) {
      value.replace(position, std::strlen(replacement.first), replacement.second);
      position += std::strlen(replacement.second);
    }
  }
  return trim(value);
}

std::string xmlValue(const std::string& xml, std::initializer_list<const char*> names) {
  size_t position = 0;
  while ((position = xml.find('<', position)) != std::string::npos) {
    if (position + 1 >= xml.size() || xml[position + 1] == '/' || xml[position + 1] == '!' ||
        xml[position + 1] == '?') {
      ++position;
      continue;
    }
    const size_t nameStart = position + 1;
    size_t nameEnd = nameStart;
    while (nameEnd < xml.size() && xml[nameEnd] != '>' && xml[nameEnd] != '/' &&
           !std::isspace(static_cast<unsigned char>(xml[nameEnd]))) {
      ++nameEnd;
    }
    const std::string tagName = localName(xml.substr(nameStart, nameEnd - nameStart));
    bool wanted = false;
    for (const char* name : names) {
      if (tagName == lower(name)) {
        wanted = true;
        break;
      }
    }
    const size_t openEnd = xml.find('>', nameEnd);
    if (openEnd == std::string::npos) {
      return {};
    }
    if (wanted && openEnd > position && xml[openEnd - 1] != '/') {
      const std::string closingPrefix = "</";
      size_t closing = xml.find(closingPrefix, openEnd + 1);
      if (closing != std::string::npos) {
        return decodeXmlEntities(xml.substr(openEnd + 1, closing - openEnd - 1));
      }
    }
    position = openEnd + 1;
  }
  return {};
}

std::string currentIso(const std::string& timezoneOffset) {
  const auto now = std::chrono::system_clock::now();
  const std::time_t timestamp = std::chrono::system_clock::to_time_t(now);
  std::tm utc{};
#ifdef _WIN32
  gmtime_s(&utc, &timestamp);
#else
  gmtime_r(&timestamp, &utc);
#endif
  std::ostringstream output;
  output << std::put_time(&utc, "%Y-%m-%dT%H:%M:%S") << timezoneOffset;
  return output.str();
}

std::string eventTime(const std::string& xml, const std::string& timezoneOffset) {
  std::string value = xmlValue(xml, {"dateTime", "time", "eventTime", "attendanceTime"});
  if (value.empty()) {
    return currentIso(timezoneOffset);
  }
  std::replace(value.begin(), value.end(), ' ', 'T');
  if (value.back() == 'Z' || value.find('+', 10) != std::string::npos ||
      value.find('-', 10) != std::string::npos) {
    return value;
  }
  return value + timezoneOffset;
}

std::string directionFromXml(const std::string& xml) {
  const std::string direction = lower(xmlValue(xml, {"inOut", "direction", "entranceStatus"}));
  if (direction == "0" || direction == "in" || direction == "entry" || direction == "enter" ||
      direction == "entrance") {
    return "in";
  }
  if (direction == "1" || direction == "out" || direction == "exit" || direction == "leave" ||
      direction == "exits") {
    return "out";
  }
  const std::string attendance = xmlValue(xml, {"attendanceStatus"});
  if (attendance == "1") {
    return "in";
  }
  if (attendance == "2") {
    return "out";
  }
  return {};
}

std::string verificationMethodFromXml(const std::string& xml) {
  const std::string raw = lower(xmlValue(xml, {"currentVerifyMode", "verifyMode", "verificationMode"}));
  if (raw.empty()) {
    return {};
  }
  if (raw.find("face") != std::string::npos || raw == "14" || raw == "21" || raw == "22") {
    return "face";
  }
  if (raw.find("finger") != std::string::npos || raw == "5" || raw == "6" || raw == "17" ||
      raw == "18" || raw == "23") {
    return "fingerprint";
  }
  if (raw.find("card") != std::string::npos || raw == "3" || raw == "4" || raw == "7" ||
      raw == "8" || raw == "13" || raw == "24" || raw == "25" || raw == "26") {
    return "card";
  }
  if (raw.find("password") != std::string::npos || raw == "2" || raw == "9" || raw == "12" ||
      raw == "15" || raw == "16" || raw == "20" || raw == "27") {
    return "password";
  }
  return "hikvision-verify-" + raw;
}

std::string fnv1aHex(const std::string& value) {
  uint64_t hash = 1469598103934665603ULL;
  for (unsigned char ch : value) {
    hash ^= ch;
    hash *= 1099511628211ULL;
  }
  std::ostringstream output;
  output << std::hex << std::setw(16) << std::setfill('0') << hash;
  return output.str();
}

class HikvisionBridge {
 public:
  explicit HikvisionBridge(BridgeConfig config) : config_(std::move(config)) {}

  void run() {
    initializeSDK();
    startListeners();
    emitLog("native Hikvision ISUP/EHOME SDK Bridge started");
    while (g_running.load()) {
      std::this_thread::sleep_for(std::chrono::milliseconds(250));
    }
    stopListeners();
    finiSDK();
  }

 private:
  void emitLog(const std::string& message) const {
    std::lock_guard<std::mutex> lock(outputMutex_);
    std::cerr << "[hikvision-isup-ehome] " << message << std::endl;
  }

  void emitStatus(const DeviceConfig& device, const std::string& status, const std::string& message) const {
    std::lock_guard<std::mutex> lock(outputMutex_);
    std::cout << "{\"type\":\"status\",\"status\":{\"deviceCode\":" << jsonEscape(device.deviceCode)
              << ",\"status\":" << jsonEscape(status) << ",\"message\":" << jsonEscape(message) << "}}"
              << std::endl;
  }

  void emitEvent(const DeviceConfig& device, const std::string& employeeKey, const std::string& eventId,
                const std::string& occurredAt, const std::string& direction, const std::string& verification,
                unsigned int alarmType, const std::string& alarmSerial, const std::string& xml) const {
    std::lock_guard<std::mutex> lock(outputMutex_);
    std::cout << "{\"type\":\"event\",\"event\":{\"deviceCode\":" << jsonEscape(device.deviceCode)
              << ",\"deviceEmployeeKey\":" << jsonEscape(employeeKey)
              << ",\"externalEventId\":" << jsonEscape(eventId)
              << ",\"occurredAt\":" << jsonEscape(occurredAt)
              << ",\"direction\":" << jsonEscape(direction)
              << ",\"eventType\":\"attendance\",\"verificationMethod\":" << jsonEscape(verification)
              << ",\"source\":\"hikvision-isup-ehome\",\"rawPayload\":{\"alarmType\":" << alarmType
              << ",\"alarmSerialNumber\":" << jsonEscape(alarmSerial) << ",\"xml\":" << jsonEscape(xml)
              << "}}}" << std::endl;
  }

  void initializeSDK() {
#ifdef _WIN32
    if (!config_.runtimeDir.empty()) {
      SetDllDirectoryA(config_.runtimeDir.c_str());
    }
#endif
    std::filesystem::create_directories(config_.logDir);
    const std::string cryptoPath = std::filesystem::path(config_.runtimeDir).append(
#ifdef _WIN32
        "libeay32.dll"
#else
        "libcrypto.so"
#endif
    ).string();
    const std::string sslPath = std::filesystem::path(config_.runtimeDir).append(
#ifdef _WIN32
        "ssleay32.dll"
#else
        "libssl.so"
#endif
    ).string();
    const std::string comPath = std::filesystem::path(config_.runtimeDir).append("HCAapSDKCom").string();

    std::array<char, 512> crypto{};
    std::array<char, 512> ssl{};
    std::array<char, 512> components{};
    copyCString(crypto.data(), crypto.size(), cryptoPath);
    copyCString(ssl.data(), ssl.size(), sslPath);
    copyCString(components.data(), components.size(), comPath);

    if (!NET_ECMS_SetSDKInitCfg(NET_EHOME_CMS_INIT_CFG_LIBEAY_PATH, crypto.data()) ||
        !NET_ECMS_SetSDKInitCfg(NET_EHOME_CMS_INIT_CFG_SSLEAY_PATH, ssl.data())) {
      throw std::runtime_error("NET_ECMS_SetSDKInitCfg failed, error=" +
                               std::to_string(NET_ECMS_GetLastError()));
    }
    if (!NET_EALARM_SetSDKInitCfg(NET_EHOME_EALARM_INIT_CFG_LIBEAY_PATH, crypto.data()) ||
        !NET_EALARM_SetSDKInitCfg(NET_EHOME_EALARM_INIT_CFG_SSLEAY_PATH, ssl.data())) {
      throw std::runtime_error("NET_EALARM_SetSDKInitCfg failed, error=" +
                               std::to_string(NET_EALARM_GetLastError()));
    }
    if (!NET_ECMS_Init()) {
      throw std::runtime_error("NET_ECMS_Init failed, error=" + std::to_string(NET_ECMS_GetLastError()));
    }
    cmsInitialized_ = true;
    if (!NET_EALARM_Init()) {
      throw std::runtime_error("NET_EALARM_Init failed, error=" + std::to_string(NET_EALARM_GetLastError()));
    }
    alarmInitialized_ = true;
    if (!NET_ECMS_SetSDKLocalCfg(COM_PATH, components.data()) ||
        !NET_EALARM_SetSDKLocalCfg(COM_PATH, components.data())) {
      emitLog("warning: setting HCAapSDKCom path failed; check official SDK runtime layout");
    }
    const std::string logDir = std::filesystem::absolute(config_.logDir).string();
    NET_ECMS_SetLogToFile(3, const_cast<char*>(logDir.c_str()), FALSE);
    NET_EALARM_SetLogToFile(3, logDir.c_str(), FALSE);
  }

  void startListeners() {
    const DeviceConfig* firstEnabled = nullptr;
    for (const DeviceConfig& device : config_.devices) {
      if (device.enabled) {
        firstEnabled = &device;
        break;
      }
    }
    if (firstEnabled == nullptr) {
      throw std::runtime_error("no enabled Hikvision device configured");
    }

    std::memset(&cmsListen_, 0, sizeof(cmsListen_));
    copyCString(cmsListen_.struAddress.szIP, sizeof(cmsListen_.struAddress.szIP), "0.0.0.0");
    cmsListen_.struAddress.wPort = static_cast<WORD>(firstEnabled->registrationPort);
    cmsListen_.fnCB = &HikvisionBridge::registerCallback;
    cmsListen_.pUserData = this;
    cmsListen_.dwKeepAliveSec = 30;
    cmsListen_.dwTimeOutCount = 3;
    cmsHandle_ = NET_ECMS_StartListen(&cmsListen_);
    if (cmsHandle_ < 0) {
      throw std::runtime_error("NET_ECMS_StartListen failed, error=" +
                               std::to_string(NET_ECMS_GetLastError()));
    }

    std::memset(&alarmListen_, 0, sizeof(alarmListen_));
    copyCString(alarmListen_.struAddress.szIP, sizeof(alarmListen_.struAddress.szIP), "0.0.0.0");
    alarmListen_.fnMsgCb = &HikvisionBridge::alarmCallback;
    alarmListen_.pUserData = this;
    alarmListen_.byUseCmsPort = 0;
    alarmListen_.byUseThreadPool = 0;
    alarmListen_.dwKeepAliveSec = 30;
    alarmListen_.dwTimeOutCount = 3;
    if (config_.alarmProtocol == "udp") {
      alarmListen_.struAddress.wPort = static_cast<WORD>(firstEnabled->alarmUdpPort);
      alarmListen_.byProtocolType = 1;
    } else {
      alarmListen_.struAddress.wPort = static_cast<WORD>(firstEnabled->alarmTcpPort);
      alarmListen_.byProtocolType = 0;
    }
    alarmHandle_ = NET_EALARM_StartListen(&alarmListen_);
    if (alarmHandle_ < 0) {
      throw std::runtime_error("NET_EALARM_StartListen failed, error=" +
                               std::to_string(NET_EALARM_GetLastError()));
    }
    emitLog("CMS listening on port " + std::to_string(firstEnabled->registrationPort) +
            ", alarm listening on " + config_.alarmProtocol);
  }

  void stopListeners() {
    if (alarmHandle_ >= 0) {
      NET_EALARM_StopListen(alarmHandle_);
      alarmHandle_ = -1;
    }
    if (cmsHandle_ >= 0) {
      NET_ECMS_StopListen(cmsHandle_);
      cmsHandle_ = -1;
    }
  }

  void finiSDK() {
    if (alarmInitialized_) {
      NET_EALARM_Fini();
      alarmInitialized_ = false;
    }
    if (cmsInitialized_) {
      NET_ECMS_Fini();
      cmsInitialized_ = false;
    }
  }

  DeviceConfig* findDeviceByRegistrationId(const std::string& deviceId) {
    for (DeviceConfig& device : config_.devices) {
      if (device.enabled && (device.registrationId == deviceId || device.deviceCode == deviceId)) {
        return &device;
      }
    }
    return nullptr;
  }

  DeviceConfig* findDeviceBySerial(const std::string& serial) {
    for (DeviceConfig& device : config_.devices) {
      if (device.enabled && device.serial == serial) {
        return &device;
      }
    }
    return nullptr;
  }

  DeviceConfig* findDevice(LONG userId) {
    std::lock_guard<std::mutex> lock(stateMutex_);
    const auto it = users_.find(userId);
    if (it == users_.end()) {
      return nullptr;
    }
    return &config_.devices[it->second];
  }

  DeviceConfig* identifyDevice(const NET_EHOME_DEV_REG_INFO_V12& info) {
    const std::string deviceId = bytesToString(info.struRegInfo.byDeviceID, MAX_DEVICE_ID_LEN);
    const std::string serial = bytesToString(info.struRegInfo.sDeviceSerial, NET_EHOME_SERIAL_LEN);
    DeviceConfig* device = findDeviceByRegistrationId(deviceId);
    if (device == nullptr && !serial.empty()) {
      device = findDeviceBySerial(serial);
    }
    if (device != nullptr) {
      device->deviceId = deviceId;
      device->serial = serial;
    }
    return device;
  }

  static BOOL CALLBACK registerCallback(LONG userId, DWORD dataType, void* outBuffer, DWORD outLength,
                                        void* inBuffer, DWORD inLength, void* userData) {
    auto* bridge = static_cast<HikvisionBridge*>(userData);
    if (bridge == nullptr) {
      return FALSE;
    }
    return bridge->onRegister(userId, dataType, outBuffer, outLength, inBuffer, inLength) ? TRUE : FALSE;
  }

  bool onRegister(LONG userId, DWORD dataType, void* outBuffer, DWORD outLength, void* inBuffer,
                  DWORD inLength) {
    NET_EHOME_DEV_REG_INFO_V12 info{};
    if (outBuffer != nullptr && outLength > 0) {
      std::memcpy(&info, outBuffer, std::min<size_t>(sizeof(info), outLength));
    }
    DeviceConfig* device = identifyDevice(info);

    switch (dataType) {
      case ENUM_DEV_AUTH:
        if (device == nullptr) {
          emitLog("rejecting AUTH for unknown device id=" +
                  bytesToString(info.struRegInfo.byDeviceID, MAX_DEVICE_ID_LEN));
          return false;
        }
        if (inBuffer == nullptr || inLength < device->isupKey.size()) {
          emitLog("AUTH response buffer too small for " + device->deviceCode);
          return false;
        }
        std::memset(inBuffer, 0, inLength);
        std::memcpy(inBuffer, device->isupKey.data(), device->isupKey.size());
        return true;

      case ENUM_DEV_ON: {
        if (device == nullptr) {
          emitLog("device registered but is not configured, id=" +
                  bytesToString(info.struRegInfo.byDeviceID, MAX_DEVICE_ID_LEN));
          return false;
        }
        {
          std::lock_guard<std::mutex> lock(stateMutex_);
          users_[userId] = static_cast<size_t>(device - config_.devices.data());
        }
        NET_EHOME_SERVER_INFO_V50 serverInfo{};
        serverInfo.dwSize = sizeof(serverInfo);
        copyCString(serverInfo.struTCPAlarmSever.szIP, sizeof(serverInfo.struTCPAlarmSever.szIP),
                    config_.publicAddress);
        copyCString(serverInfo.struUDPAlarmSever.szIP, sizeof(serverInfo.struUDPAlarmSever.szIP),
                    config_.publicAddress);
        serverInfo.dwAlarmServerType = config_.alarmProtocol == "udp" ? 0 : 1;
        serverInfo.struTCPAlarmSever.wPort = static_cast<WORD>(device->alarmTcpPort);
        serverInfo.struUDPAlarmSever.wPort = static_cast<WORD>(device->alarmUdpPort);
        if (inBuffer == nullptr || inLength < sizeof(serverInfo)) {
          emitLog("ON response buffer too small for " + device->deviceCode);
          return false;
        }
        std::memcpy(inBuffer, &serverInfo, sizeof(serverInfo));
        emitStatus(*device, "registered", "ISUP device registered");
        return true;
      }

      case ENUM_DEV_OFF:
        if (device != nullptr) {
          emitStatus(*device, "offline", "ISUP device disconnected");
        }
        {
          std::lock_guard<std::mutex> lock(stateMutex_);
          users_.erase(userId);
        }
        return true;

      case ENUM_DEV_SESSIONKEY: {
        if (device == nullptr) {
          emitLog("SESSIONKEY received for unknown device");
          return false;
        }
        NET_EHOME_DEV_SESSIONKEY sessionKey{};
        std::memcpy(sessionKey.sDeviceID, info.struRegInfo.byDeviceID, sizeof(sessionKey.sDeviceID));
        std::memcpy(sessionKey.sSessionKey, info.struRegInfo.bySessionKey, sizeof(sessionKey.sSessionKey));
        const bool cmsOk = NET_ECMS_SetDeviceSessionKey(&sessionKey) == TRUE;
        const bool alarmOk = NET_EALARM_SetDeviceSessionKey(&sessionKey) == TRUE;
        if (!cmsOk || !alarmOk) {
          emitLog("setting SessionKey failed for " + device->deviceCode);
          emitStatus(*device, "error", "setting ISUP SessionKey failed");
          return false;
        }
        emitStatus(*device, "registered", "ISUP SessionKey established");
        return true;
      }

      case ENUM_DEV_DAS_REREGISTER:
        if (device != nullptr) {
          emitStatus(*device, "registered", "ISUP device requested re-register");
        }
        return true;

      case ENUM_DEV_DAS_PINGREO:
        if (device != nullptr) {
          emitStatus(*device, "heartbeat", "ISUP device heartbeat");
        }
        return true;

      case ENUM_DEV_DAS_EHOMEKEY_ERROR:
      case ENUM_DEV_SESSIONKEY_ERROR:
        if (device != nullptr) {
          emitStatus(*device, "error", "ISUP key/session key negotiation failed");
        }
        return false;

      default:
        return true;
    }
  }

  static BOOL CALLBACK alarmCallback(LONG, NET_EHOME_ALARM_MSG* alarmMessage, void* userData) {
    auto* bridge = static_cast<HikvisionBridge*>(userData);
    if (bridge == nullptr) {
      return FALSE;
    }
    bridge->onAlarm(alarmMessage);
    return TRUE;
  }

  void onAlarm(const NET_EHOME_ALARM_MSG* alarmMessage) {
    if (alarmMessage == nullptr) {
      return;
    }
    const std::string serial = bytesToString(alarmMessage->sSerialNumber, NET_EHOME_SERIAL_LEN);
    DeviceConfig* device = findDeviceBySerial(serial);
    std::string xml;
    if (alarmMessage->pXmlBuf != nullptr && alarmMessage->dwXmlBufLen > 0) {
      xml.assign(static_cast<const char*>(alarmMessage->pXmlBuf), alarmMessage->dwXmlBufLen);
    }
    std::string alarmDeviceId;
    std::string alarmTime;
    if (alarmMessage->pAlarmInfo != nullptr &&
        alarmMessage->dwAlarmInfoLen >= sizeof(NET_EHOME_ALARM_INFO)) {
      const auto* alarmInfo = static_cast<const NET_EHOME_ALARM_INFO*>(alarmMessage->pAlarmInfo);
      alarmDeviceId = bytesToString(alarmInfo->szDeviceID, MAX_DEVICE_ID_LEN);
      alarmTime = bytesToString(alarmInfo->szAlarmTime, MAX_TIME_LEN);
    }
    if (device == nullptr && !alarmDeviceId.empty()) {
      device = findDeviceByRegistrationId(alarmDeviceId);
    }
    const std::string xmlDeviceId = xmlValue(xml, {"deviceID", "deviceId", "registrationId"});
    if (device == nullptr && !xmlDeviceId.empty()) {
      device = findDeviceByRegistrationId(xmlDeviceId);
    }
    if (device == nullptr) {
      emitLog("ignoring alarm from unknown device serial=" + serial);
      return;
    }
    if (alarmMessage->dwAlarmType != EHOME_ALARM_ACS) {
      emitLog("ignoring non-ACS alarm type=" + std::to_string(alarmMessage->dwAlarmType) +
              " from " + device->deviceCode);
      return;
    }
    const std::string employeeKey = xmlValue(xml, {"employeeNo", "employeeNoString", "pin", "userId"});
    if (employeeKey.empty()) {
      emitLog("ignoring ACS alarm without employee number from " + device->deviceCode);
      return;
    }
    std::string eventId = xmlValue(xml, {"eventId", "eventID", "serialNo", "eventNo"});
    if (eventId.empty()) {
      eventId = device->deviceCode + "-" + fnv1aHex(xml);
    }
    std::string occurredAt = eventTime(xml, config_.timezoneOffset);
    if (xml.empty() && !alarmTime.empty()) {
      std::string normalizedAlarmTime = alarmTime;
      std::replace(normalizedAlarmTime.begin(), normalizedAlarmTime.end(), ' ', 'T');
      occurredAt = normalizedAlarmTime + config_.timezoneOffset;
    }
    emitEvent(*device, employeeKey, eventId, occurredAt, directionFromXml(xml),
              verificationMethodFromXml(xml), alarmMessage->dwAlarmType, serial, xml);
  }

  BridgeConfig config_;
  mutable std::mutex outputMutex_;
  std::mutex stateMutex_;
  std::unordered_map<LONG, size_t> users_;
  NET_EHOME_CMS_LISTEN_PARAM cmsListen_{};
  NET_EHOME_ALARM_LISTEN_PARAM alarmListen_{};
  LONG cmsHandle_ = -1;
  LONG alarmHandle_ = -1;
  bool cmsInitialized_ = false;
  bool alarmInitialized_ = false;
};

}  // namespace

int main(int argc, char** argv) {
  std::signal(SIGINT, handleSignal);
#ifndef _WIN32
  std::signal(SIGTERM, handleSignal);
#endif
  try {
    std::string configPath = envOr("ISUP_GATEWAY_CONFIG_FILE");
    if (argc > 1) {
      configPath = argv[1];
    }
    if (configPath.empty()) {
      throw std::runtime_error("ISUP_GATEWAY_CONFIG_FILE is required");
    }
    HikvisionBridge bridge(loadConfig(configPath));
    bridge.run();
    return 0;
  } catch (const std::exception& error) {
    std::cerr << "[hikvision-isup-ehome] fatal: " << error.what() << std::endl;
    return 1;
  }
}
