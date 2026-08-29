cmake_minimum_required(VERSION 3.20)

project(xdfc_isup_sdk_bridge LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

if(NOT HIKVISION_SDK_ROOT)
  message(FATAL_ERROR
    "HIKVISION_SDK_ROOT is required. Point it at the official Hikvision ISUP/EHOME SDK package.")
endif()

if(NOT EXISTS "${HIKVISION_SDK_ROOT}/incCn/HCISUPCMS.h")
  message(FATAL_ERROR
    "Cannot find ${HIKVISION_SDK_ROOT}/incCn/HCISUPCMS.h. Use the official SDK package root.")
endif()

if(WIN32)
  set(HIKVISION_SDK_LIB_DIR "${HIKVISION_SDK_ROOT}/lib64")
else()
  if(EXISTS "${HIKVISION_SDK_ROOT}/lib64")
    set(HIKVISION_SDK_LIB_DIR "${HIKVISION_SDK_ROOT}/lib64")
  else()
    set(HIKVISION_SDK_LIB_DIR "${HIKVISION_SDK_ROOT}/lib")
  endif()
endif()

find_library(HCISUPCMS_LIBRARY
  NAMES HCISUPCMS libHCISUPCMS
  PATHS "${HIKVISION_SDK_LIB_DIR}"
  NO_DEFAULT_PATH
  REQUIRED
)

find_library(HCISUPALARM_LIBRARY
  NAMES HCISUPAlarm libHCISUPAlarm
  PATHS "${HIKVISION_SDK_LIB_DIR}"
  NO_DEFAULT_PATH
  REQUIRED
)

add_executable(xdfc-isup-sdk-bridge src/main.cpp)

target_include_directories(xdfc-isup-sdk-bridge PRIVATE
  "${HIKVISION_SDK_ROOT}/incCn"
)

target_link_libraries(xdfc-isup-sdk-bridge PRIVATE
  "${HCISUPCMS_LIBRARY}"
  "${HCISUPALARM_LIBRARY}"
)

if(WIN32)
  target_link_libraries(xdfc-isup-sdk-bridge PRIVATE Ws2_32)
  target_compile_definitions(xdfc-isup-sdk-bridge PRIVATE WIN32_LEAN_AND_MEAN NOMINMAX)
else()
  target_link_libraries(xdfc-isup-sdk-bridge PRIVATE dl pthread)
  set_target_properties(xdfc-isup-sdk-bridge PROPERTIES
    BUILD_RPATH "\$ORIGIN/vendor/lib64;\$ORIGIN/vendor/lib"
    INSTALL_RPATH "\$ORIGIN/vendor/lib64;\$ORIGIN/vendor/lib"
  )
endif()

if(MSVC)
  target_compile_options(xdfc-isup-sdk-bridge PRIVATE /W4 /EHsc)
else()
  target_compile_options(xdfc-isup-sdk-bridge PRIVATE -Wall -Wextra -Wpedantic)
endif()

