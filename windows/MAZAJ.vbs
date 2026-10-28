' MAZAJ Coffee Shop - silent launcher (no black window).
' Starts the local server (if not already running) and opens the register
' in Chrome / Edge app mode with instant (dialog-free) receipt printing.
Option Explicit
Dim sh, fso, appDir, url, profile, http, ready, i, browser
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
appDir = fso.GetParentFolderName(WScript.ScriptFullName)
url = "http://localhost:8080"
profile = sh.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\MazajPOS"

Function ServerUp()
  On Error Resume Next
  Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
  http.setTimeouts 1000, 1000, 1000, 1000
  http.open "GET", url & "/favicon.png", False
  http.send
  ServerUp = (Err.Number = 0 And http.status = 200)
  On Error GoTo 0
End Function

If Not ServerUp() Then
  sh.CurrentDirectory = appDir
  sh.Environment("PROCESS")("HOST") = "0.0.0.0"
  sh.Environment("PROCESS")("PORT") = "8080"
  sh.Environment("PROCESS")("NODE_ENV") = "production"
  sh.Run """" & appDir & "\node.exe"" """ & appDir & "\app\server\index.mjs""", 0, False
  ready = False
  For i = 1 To 40
    WScript.Sleep 500
    If ServerUp() Then ready = True : Exit For
  Next
  If Not ready Then
    MsgBox "MAZAJ server did not start. Close other apps using port 8080 and try again.", 16, "MAZAJ Coffee Shop"
    WScript.Quit 1
  End If
End If

browser = ""
If fso.FileExists(sh.ExpandEnvironmentStrings("%ProgramFiles%") & "\Google\Chrome\Application\chrome.exe") Then
  browser = sh.ExpandEnvironmentStrings("%ProgramFiles%") & "\Google\Chrome\Application\chrome.exe"
ElseIf fso.FileExists(sh.ExpandEnvironmentStrings("%ProgramFiles(x86)%") & "\Google\Chrome\Application\chrome.exe") Then
  browser = sh.ExpandEnvironmentStrings("%ProgramFiles(x86)%") & "\Google\Chrome\Application\chrome.exe"
ElseIf fso.FileExists(sh.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\Google\Chrome\Application\chrome.exe") Then
  browser = sh.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\Google\Chrome\Application\chrome.exe"
ElseIf fso.FileExists(sh.ExpandEnvironmentStrings("%ProgramFiles(x86)%") & "\Microsoft\Edge\Application\msedge.exe") Then
  browser = sh.ExpandEnvironmentStrings("%ProgramFiles(x86)%") & "\Microsoft\Edge\Application\msedge.exe"
ElseIf fso.FileExists(sh.ExpandEnvironmentStrings("%ProgramFiles%") & "\Microsoft\Edge\Application\msedge.exe") Then
  browser = sh.ExpandEnvironmentStrings("%ProgramFiles%") & "\Microsoft\Edge\Application\msedge.exe"
End If

If browser = "" Then
  sh.Run url, 1, False
Else
  sh.Run """" & browser & """ --kiosk-printing --app=" & url & " --user-data-dir=""" & profile & """ --start-maximized", 1, False
End If
