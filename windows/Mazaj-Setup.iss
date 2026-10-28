; MAZAJ Coffee Shop - Inno Setup script
; 1) Run windows\build-desktop.bat   2) Right-click this file > Compile
#define AppName "MAZAJ Coffee Shop"
#define AppVersion "1.0.0"

[Setup]
AppId={{8B6F2C1E-4D7A-4E59-9A3B-6C2D1F0E7A11}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher=MAZAJ
DefaultDirName={autopf}\MAZAJ Coffee Shop
DefaultGroupName={#AppName}
DisableProgramGroupPage=yes
OutputDir=Output
OutputBaseFilename=Mazaj-POS-Setup-v{#AppVersion}
SetupIconFile=mazaj.ico
UninstallDisplayIcon={app}\mazaj.ico
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin

[Languages]
Name: "french"; MessagesFile: "compiler:Languages\French.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"
Name: "autostart"; Description: "Start MAZAJ when Windows starts"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "stage\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#AppName}"; Filename: "{sys}\wscript.exe"; Parameters: """{app}\MAZAJ.vbs"""; WorkingDir: "{app}"; IconFilename: "{app}\mazaj.ico"
Name: "{group}\Stop MAZAJ server"; Filename: "{app}\Stop-MAZAJ.bat"; WorkingDir: "{app}"; IconFilename: "{app}\mazaj.ico"
Name: "{group}\Uninstall {#AppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#AppName}"; Filename: "{sys}\wscript.exe"; Parameters: """{app}\MAZAJ.vbs"""; WorkingDir: "{app}"; IconFilename: "{app}\mazaj.ico"; Tasks: desktopicon
Name: "{userstartup}\{#AppName}"; Filename: "{sys}\wscript.exe"; Parameters: """{app}\MAZAJ.vbs"""; WorkingDir: "{app}"; IconFilename: "{app}\mazaj.ico"; Tasks: autostart

[Run]
; Let waiter phones on the same Wi-Fi reach the PC (private networks only).
Filename: "{sys}\netsh.exe"; Parameters: "advfirewall firewall add rule name=""MAZAJ Coffee Shop"" dir=in action=allow program=""{app}\node.exe"" enable=yes profile=private"; Flags: runhidden
Filename: "{sys}\wscript.exe"; Parameters: """{app}\MAZAJ.vbs"""; Description: "{cm:LaunchProgram,{#AppName}}"; Flags: postinstall nowait skipifsilent

[UninstallRun]
Filename: "{app}\Stop-MAZAJ.bat"; Flags: runhidden; RunOnceId: "StopServer"
Filename: "{sys}\netsh.exe"; Parameters: "advfirewall firewall delete rule name=""MAZAJ Coffee Shop"""; Flags: runhidden; RunOnceId: "DelFirewall"
