from typing import List, Dict, Tuple

CATEGORIES = ['HARDWARE', 'SOFTWARE', 'NETWORK', 'ACCESS_IAM', 'SECURITY']
PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

CATEGORY_SKILL_MAP: Dict[str, List[str]] = {
    'HARDWARE': ['Hardware Diagnostics', 'Laptop Repair', 'Peripheral Configuration', 'RAM & Storage', 'Printer Fleet'],
    'SOFTWARE': ['Windows 11', 'macOS', 'Microsoft 365', 'Application Debugging', 'Docker & DevTools'],
    'NETWORK': ['Networking', 'VPN', 'Cisco AnyConnect', 'DNS Configuration', 'Switch & Routing'],
    'ACCESS_IAM': ['Active Directory', 'Azure AD', 'SSO & MFA', 'Identity Provider', 'RBAC Management'],
    'SECURITY': ['Platform Security', 'Incident Command', 'Threat Mitigation', 'Phishing Analysis', 'Endpoint Security']
}

RAW_TRAINING_DATA: List[Dict[str, str]] = [
    # ==================== HARDWARE (25 samples) ====================
    {
        "title": "MacBook Pro display flickering with vertical purple lines",
        "description": "My 16-inch laptop screen started flickering rapidly with vertical purple lines after opening the lid this morning. External HDMI monitor works fine, so it seems like an internal display ribbon or GPU hardware fault.",
        "category": "HARDWARE",
        "priority": "HIGH"
    },
    {
        "title": "Dell workstation overheating and fans running at maximum RPM constantly",
        "description": "The cooling fans on my desktop workstation are spinning at 100% continuously even during idle. The chassis feels very hot to the touch and thermal throttling is causing severe system stuttering.",
        "category": "HARDWARE",
        "priority": "MEDIUM"
    },
    {
        "title": "Laptop battery swollen and trackpad lifting up fire hazard",
        "description": "URGENT: Noticeable bulge beneath the keyboard and the trackpad is popping out of its aluminum frame. The battery appears severely swollen and could pose a chemical or fire hazard. Requesting immediate replacement.",
        "category": "HARDWARE",
        "priority": "CRITICAL"
    },
    {
        "title": "Need second monitor for financial modeling spreadsheet workflow",
        "description": "Requesting an additional 27-inch Dell UltraSharp 4K monitor and USB-C display dock to expand workspace for quarterly financial reconciliation spreadsheets.",
        "category": "HARDWARE",
        "priority": "LOW"
    },
    {
        "title": "HP LaserJet office printer Tray 2 paper jam and gear grinding noise",
        "description": "The third floor communal laser printer displays Error 13.00.00 Paper Jam. Opened the side hatch and removed jammed sheets, but the pickup roller continues to make loud grinding noises.",
        "category": "HARDWARE",
        "priority": "MEDIUM"
    },
    {
        "title": "Replacement USB-C laptop power supply charger brick",
        "description": "Left my 140W USB-C charging cable and power adapter at the airport during a business trip. Laptop is at 8% battery, need a loaner charger from the IT depot.",
        "category": "HARDWARE",
        "priority": "MEDIUM"
    },
    {
        "title": "Mechanical keyboard spacebar and enter keys unresponsive",
        "description": "Several keys including spacebar and backspace stopped registering keypresses. Swapped USB ports and tested on another machine with no change. Requesting replacement keyboard.",
        "category": "HARDWARE",
        "priority": "LOW"
    },
    {
        "title": "RAM memory upgrade request for mobile engineering laptop",
        "description": "Compiling Android and iOS binaries is exhausting all 16GB of system memory and hitting swap space. Requesting upgrade to 32GB or 64GB RAM for mobile build workflows.",
        "category": "HARDWARE",
        "priority": "LOW"
    },
    {
        "title": "Docking station dual DisplayPort monitors not detected",
        "description": "Thunderbolt docking station supplies power over USB-C, but neither of the dual external monitors are detected in Windows display settings after the firmware update.",
        "category": "HARDWARE",
        "priority": "MEDIUM"
    },
    {
        "title": "Hard disk clicking noise and uncorrectable sector read error",
        "description": "Secondary internal SATA hard drive is making cyclic clicking sounds (click of death) and SMART self-test reports 120 reallocated bad sectors. Need drive replacement.",
        "category": "HARDWARE",
        "priority": "HIGH"
    },
    {
        "title": "Wireless mouse optical laser sensor not tracking on mousepad",
        "description": "Logitech wireless ergonomic mouse connects via Bluetooth, but the optical cursor does not move on desk surfaces. Replaced AA batteries with no improvement.",
        "category": "HARDWARE",
        "priority": "LOW"
    },
    {
        "title": "Conference room audio soundbar microphone crackling during town hall",
        "description": "Poly studio soundbar in Boardroom A emits static and crackling noises on microphone input during executive presentations.",
        "category": "HARDWARE",
        "priority": "HIGH"
    },
    {
        "title": "Workstation power supply failed, unit completely dead with no LED",
        "description": "Computer shut down abruptly with a faint electrical pop smell. The motherboard power LEDs are unlit and pressing the power button produces no response.",
        "category": "HARDWARE",
        "priority": "HIGH"
    },
    {
        "title": "Barcode scanner USB handheld unit disconnected in shipping depot",
        "description": "The Zebra laser barcode scanner at shipping dock 3 is not transmitting scanned package serial numbers into the inventory terminal.",
        "category": "HARDWARE",
        "priority": "MEDIUM"
    },
    {
        "title": "Laptop hinge cracked and bezel separating from display",
        "description": "The left hinge on the Lenovo ThinkPad has seized up and cracked the outer plastic casing when opening. Screen flex cable is exposed.",
        "category": "HARDWARE",
        "priority": "MEDIUM"
    },
    {
        "title": "Webcam video feed distorted with green static bars",
        "description": "Integrated laptop webcam shows green horizontal artifacts and distorted pixelation during internal Google Meet calls.",
        "category": "HARDWARE",
        "priority": "LOW"
    },
    {
        "title": "External NVMe SSD enclosure not recognized over USB 3.2 port",
        "description": "High-speed external drive enclosure is undetected in Disk Management. LED indicator blinks rapidly but volume does not mount.",
        "category": "HARDWARE",
        "priority": "LOW"
    },
    {
        "title": "Server rack KVM console switch keyboard unresponsive",
        "description": "The slide-out rack console in Datacenter Row 2 has a broken touchpad and keyboard cable. Technicians cannot access local CLI.",
        "category": "HARDWARE",
        "priority": "MEDIUM"
    },
    {
        "title": "Toner cartridge replacement needed for floor 2 color copier",
        "description": "Multifunction office printer warns Magenta toner very low (2%). Printouts have faint color streaks.",
        "category": "HARDWARE",
        "priority": "LOW"
    },
    {
        "title": "CRITICAL: Datacenter UPS battery backup beeping continuous fault alarm",
        "description": "EMERGENCY: APC Smart-UPS in Server Room B is emitting a high-pitch continuous alarm with red replace battery indicator. Risk of total power loss to production servers.",
        "category": "HARDWARE",
        "priority": "CRITICAL"
    },
    {
        "title": "Ergonomic standing desk motor jammed in lowest position",
        "description": "Electric sit-stand desk controller shows Error E08. Reset procedure did not resolve jam.",
        "category": "HARDWARE",
        "priority": "LOW"
    },
    {
        "title": "Headset boom microphone broken at swivel joint",
        "description": "Jabra noise-cancelling call center headset snapped at the plastic hinge. Audio works but microphone is dangling.",
        "category": "HARDWARE",
        "priority": "LOW"
    },
    {
        "title": "CPU liquid cooler pump failure causing 100C thermal shutdown",
        "description": "Deep learning training rig shuts down after 3 minutes under load. BIOS indicates AIO pump speed is 0 RPM.",
        "category": "HARDWARE",
        "priority": "HIGH"
    },
    {
        "title": "Printer drum unit replacement needed for sharp smudge marks",
        "description": "Repetitive vertical black smudges across all printed legal documents. Drum maintenance kit required.",
        "category": "HARDWARE",
        "priority": "LOW"
    },
    {
        "title": "MacBook trackpad haptic click completely unresponsive",
        "description": "Force Touch trackpad has stopped providing haptic feedback click. Gestures work intermittently.",
        "category": "HARDWARE",
        "priority": "LOW"
    },

    # ==================== SOFTWARE (25 samples) ====================
    {
        "title": "Microsoft Excel crashing when opening 50MB financial macro workbook",
        "description": "Every time I attempt to open the FY25 budget workbook containing VBA macros, Excel becomes unresponsive and terminates with error code 0xc0000005. Tried running in safe mode without success.",
        "category": "SOFTWARE",
        "priority": "HIGH"
    },
    {
        "title": "Zoom client crashing instantly upon clicking share screen",
        "description": "Whenever I click 'Share Screen' during a client meeting, the Zoom desktop application crashes with a segmentation fault. Running latest macOS Sonoma release.",
        "category": "SOFTWARE",
        "priority": "HIGH"
    },
    {
        "title": "Docker Desktop WSL2 backend engine fails to start",
        "description": "Docker Desktop hangs indefinitely on 'Starting the Docker Engine...' message. Windows WSL2 logs indicate Hyper-V virtualization backend timeout.",
        "category": "SOFTWARE",
        "priority": "MEDIUM"
    },
    {
        "title": "Adobe Acrobat Pro prompting for enterprise license activation",
        "description": "Adobe Acrobat PDF editor displays 'License Expired - Sign In with Enterprise ID'. Clicking SSO login loops back to the subscription activation screen.",
        "category": "SOFTWARE",
        "priority": "MEDIUM"
    },
    {
        "title": "VS Code TypeScript language server crashing on large repository",
        "description": "The TypeScript language service in Visual Studio Code crashes repeatedly with out-of-memory heap error when opening the monolithic frontend repo.",
        "category": "SOFTWARE",
        "priority": "LOW"
    },
    {
        "title": "Slack desktop client not playing incoming notification sounds",
        "description": "Audio alerts for mentions and direct messages do not chime even though system volume and Slack audio settings are enabled. Banner notifications still appear.",
        "category": "SOFTWARE",
        "priority": "LOW"
    },
    {
        "title": "Google Chrome browser excessive memory usage and tab crashes",
        "description": "Opening multiple research tabs causes Chrome helper processes to consume 18GB of RAM and throw 'Out of Memory' status code: RESULT_CODE_KILLED_BAD_MESSAGE.",
        "category": "SOFTWARE",
        "priority": "LOW"
    },
    {
        "title": "CRITICAL: SAP ERP financial accounting database client outage",
        "description": "EMERGENCY: All finance accounting staff cannot connect to SAP ECC. Client throws RFC_ERROR_COMMUNICATION on port 3600. Month-end payroll processing is blocked.",
        "category": "SOFTWARE",
        "priority": "CRITICAL"
    },
    {
        "title": "IntelliJ IDEA license expired and unable to pull JetBrains floating license",
        "description": "JetBrains Toolbox cannot obtain a seat from the corporate license server. Build and refactoring tools are locked out.",
        "category": "SOFTWARE",
        "priority": "MEDIUM"
    },
    {
        "title": "Postman API desktop app failing with certificate validation error",
        "description": "Sending REST API requests to internal staging microservices returns 'self-signed certificate in certificate chain'. Need to configure corporate CA bundle.",
        "category": "SOFTWARE",
        "priority": "MEDIUM"
    },
    {
        "title": "Microsoft Outlook stuck on loading profile screen on launch",
        "description": "Outlook 365 desktop client hangs at 'Processing...' splash screen. Corrupted OST file suspected.",
        "category": "SOFTWARE",
        "priority": "HIGH"
    },
    {
        "title": "Windows 11 Blue Screen of Death (BSOD) with error KERNEL_SECURITY_CHECK_FAILURE",
        "description": "Operating system crashes with blue screen bugcheck 0x139 twice daily when waking from sleep mode.",
        "category": "SOFTWARE",
        "priority": "HIGH"
    },
    {
        "title": "Git command line client throwing SSL certificate verify failed error",
        "description": "Running git clone or git pull fails with 'SSL certificate problem: unable to get local issuer certificate'. Need git config http.sslBackend configured.",
        "category": "SOFTWARE",
        "priority": "MEDIUM"
    },
    {
        "title": "Tableau Desktop unable to refresh PostgreSQL data source extract",
        "description": "Scheduled dashboard extract refresh fails with SQL timeout error 57014. Queries take over 15 minutes to run.",
        "category": "SOFTWARE",
        "priority": "MEDIUM"
    },
    {
        "title": "Microsoft Teams microphone input muted automatically every 30 seconds",
        "description": "During conference calls, Teams app automatically toggles hardware mute setting. Audio drivers reinstalled with no change.",
        "category": "SOFTWARE",
        "priority": "MEDIUM"
    },
    {
        "title": "Figma desktop app canvas black screen and WebGL context lost",
        "description": "Opening complex design files in Figma desktop app shows black blank viewport with WebGL error notification.",
        "category": "SOFTWARE",
        "priority": "LOW"
    },
    {
        "title": "Node.js npm install failing with EACCES permission denied in global directory",
        "description": "Developer environment throwing npm EACCES error when installing CLI tools globally. Node version manager configuration required.",
        "category": "SOFTWARE",
        "priority": "LOW"
    },
    {
        "title": "Salesforce Outlook integration sidebar add-in missing after Office update",
        "description": "The Salesforce email logging side-panel disappeared from Outlook toolbar after recent patch.",
        "category": "SOFTWARE",
        "priority": "LOW"
    },
    {
        "title": "PostgreSQL pgAdmin client crashing when exporting query results to CSV",
        "description": "pgAdmin 4 terminates abruptly when attempting to export query result sets larger than 100,000 rows.",
        "category": "SOFTWARE",
        "priority": "LOW"
    },
    {
        "title": "CRITICAL: Production customer billing daemon throwing unhandled exception loop",
        "description": "EMERGENCY: Billing payment microservice container crashing in CrashLoopBackOff. Customers unable to check out or subscribe.",
        "category": "SOFTWARE",
        "priority": "CRITICAL"
    },
    {
        "title": "VLC media player missing codec for proprietary security footage",
        "description": "Investigating building security incident but media player cannot render proprietary H.265 CCTV video stream.",
        "category": "SOFTWARE",
        "priority": "LOW"
    },
    {
        "title": "DBeaver database manager connection pool exhausted timeout",
        "description": "Running multi-tab SQL scripts exhausts local JDBC connection pool resulting in socket closed error.",
        "category": "SOFTWARE",
        "priority": "MEDIUM"
    },
    {
        "title": "Android Studio emulator failing to launch with HAXM virtualization error",
        "description": "Android emulator fails to boot on developer machine: 'CPU acceleration error: Android Studio requires Hyper-V or WHPX'.",
        "category": "SOFTWARE",
        "priority": "MEDIUM"
    },
    {
        "title": "macOS Homebrew package manager git remote branch mismatch",
        "description": "Brew update fails with fatal: refusing to merge unrelated histories on core tap.",
        "category": "SOFTWARE",
        "priority": "LOW"
    },
    {
        "title": "OneNote notebook sync conflict creating duplicated section tabs",
        "description": "Shared project notebook has desynced with SharePoint generating 15 conflict copy tabs.",
        "category": "SOFTWARE",
        "priority": "LOW"
    },

    # ==================== NETWORK (25 samples) ====================
    {
        "title": "Cisco AnyConnect VPN disconnected and certificate validation failed",
        "description": "Attempting to connect to vpn.servicedesk.local fails with message 'Certificate Validation Failure: Unable to verify server certificate against trusted root store'. Cannot access internal git repositories or staging clusters.",
        "category": "NETWORK",
        "priority": "HIGH"
    },
    {
        "title": "Building B Floor 3 WiFi dropping connection every 10 minutes",
        "description": "Multiple employees on Floor 3 report intermittent wireless packet drops. The SSID 'Corp-Secure-5G' disconnects and reconnects repeatedly, interrupting VoIP video calls.",
        "category": "NETWORK",
        "priority": "HIGH"
    },
    {
        "title": "CRITICAL: Cannot resolve internal DNS hostnames on corporate intranet",
        "description": "EMERGENCY: Enterprise-wide DNS outage. Local machines cannot resolve domain names ending in .servicedesk.local. All internal portals, wiki, and database hosts unreachable.",
        "category": "NETWORK",
        "priority": "CRITICAL"
    },
    {
        "title": "CRITICAL: High network latency and 40% packet loss to Austin datacenter",
        "description": "EMERGENCY: Ping tests to primary database server 10.240.12.5 show RTT jumping from 18ms to 450ms with 40% packet drop. IPsec tunnel link flapping, production traffic degraded.",
        "category": "NETWORK",
        "priority": "CRITICAL"
    },
    {
        "title": "Ethernet wall jack RJ45 port in Room 204 has no link light",
        "description": "Plugging laptop into wall ethernet jack port D-14 shows no amber/green link lights on NIC. Network adapter remains 'Network cable unplugged'.",
        "category": "NETWORK",
        "priority": "LOW"
    },
    {
        "title": "Corporate proxy server returning HTTP 407 Proxy Authentication Required",
        "description": "Web browsers show 407 error when attempting to reach external web pages. NTLM proxy credentials are not automatically passing through from Windows login.",
        "category": "NETWORK",
        "priority": "MEDIUM"
    },
    {
        "title": "Subnet IP address conflict detected on workstation static IP",
        "description": "Windows pop-up warning: 'Another computer on this network has the same IP address'. Network interface has shut down DHCP lease.",
        "category": "NETWORK",
        "priority": "MEDIUM"
    },
    {
        "title": "Guest WiFi portal splash page not loading on visitor smartphones",
        "description": "External clients and visiting auditors cannot access the captive portal terms-of-service page to authenticate on Guest-WiFi.",
        "category": "NETWORK",
        "priority": "LOW"
    },
    {
        "title": "CRITICAL: Core switch VLAN 40 routing loop causing broadcast storm",
        "description": "EMERGENCY: Network monitoring alerts indicate 95% bandwidth saturation on MDF core switch with spanning-tree topology change notifications every 3 seconds.",
        "category": "NETWORK",
        "priority": "CRITICAL"
    },
    {
        "title": "Slow file transfer speeds to centralized engineering NAS storage",
        "description": "Copying CAD schematics and dataset archives to shared SMB drive \\\\nas01\\projects is bottlenecked at 2 MB/sec instead of gigabit wire speed.",
        "category": "NETWORK",
        "priority": "MEDIUM"
    },
    {
        "title": "Firewall blocking outbound port 443 to AWS S3 endpoint",
        "description": "Production data sync script fails with Connection timed out when attempting to reach s3.us-east-1.amazonaws.com. Egress rule inspection needed.",
        "category": "NETWORK",
        "priority": "HIGH"
    },
    {
        "title": "BGP route flap causing intermittent packet loss on WAN connection",
        "description": "ISP fiber gateway connection drops packets for 30 seconds every 15 minutes due to autonomous system BGP route flapping.",
        "category": "NETWORK",
        "priority": "HIGH"
    },
    {
        "title": "VoIP desk phone displaying 'Network Link Down' and DHCP failure",
        "description": "Cisco IP desk phone cannot acquire an IP address from voice VLAN 30. Phone reboots cyclically.",
        "category": "NETWORK",
        "priority": "MEDIUM"
    },
    {
        "title": "SSL inspection certificate error when browsing HTTPS sites",
        "description": "Web browser warns 'Your connection is not private' (NET::ERR_CERT_AUTHORITY_INVALID) caused by corporate Palo Alto firewall deep packet inspection cert.",
        "category": "NETWORK",
        "priority": "MEDIUM"
    },
    {
        "title": "Remote worker unable to route traffic through split-tunnel VPN",
        "description": "When connected to AnyConnect, employee cannot access local home network printer at 192.168.1.100 due to strict routing table push.",
        "category": "NETWORK",
        "priority": "LOW"
    },
    {
        "title": "Network traceroute reveals routing black hole on gateway hop 4",
        "description": "Packets destined for European subsidiary datacenter are dropped at intermediate transit carrier router.",
        "category": "NETWORK",
        "priority": "HIGH"
    },
    {
        "title": "Public IP address blacklisted on Spamhaus Zen reputation list",
        "description": "Outbound corporate emails are being rejected by external mail servers because office egress IP 198.51.100.22 is flagged on spam blocklist.",
        "category": "NETWORK",
        "priority": "HIGH"
    },
    {
        "title": "Network switch SFP+ 10Gbps optical transceiver link down",
        "description": "Datacenter leaf switch port 48 shows loss of optical carrier signal. Fiber patch cord or transceiver module requires replacement.",
        "category": "NETWORK",
        "priority": "HIGH"
    },
    {
        "title": "DHCP scope exhausted on Floor 4 wireless subnet",
        "description": "Mobile devices cannot obtain IP addresses on 10.100.4.0/24. DHCP server log shows 0 available leases remaining.",
        "category": "NETWORK",
        "priority": "HIGH"
    },
    {
        "title": "Speedtest reveals download speed capped at 10 Mbps on 1Gbps link",
        "description": "Workstation NIC auto-negotiated to 10BASE-T Half-Duplex instead of 1000BASE-T Full-Duplex due to damaged pin in wall jack.",
        "category": "NETWORK",
        "priority": "LOW"
    },
    {
        "title": "Jumbo frames MTU mismatch causing dropped packets over SAN iSCSI",
        "description": "Storage Area Network reports degraded iSCSI volume throughput. Switch MTU is set to 1500 instead of 9000 jumbo frames.",
        "category": "NETWORK",
        "priority": "MEDIUM"
    },
    {
        "title": "NAT overload table overflow on edge router during all-hands video stream",
        "description": "Town hall broadcast caused router NAT translation table to max out at 65535 entries, dropping new outbound connections.",
        "category": "NETWORK",
        "priority": "HIGH"
    },
    {
        "title": "Cannot access staging server IP over IPv6 network configuration",
        "description": "Machines with IPv6 enabled are unable to ping staging.internal due to missing AAAA DNS records.",
        "category": "NETWORK",
        "priority": "LOW"
    },
    {
        "title": "WiFi signal dead zone in south conference room",
        "description": "Wireless signal drops to 1 bar inside Meeting Room 102. Requesting additional ceiling access point.",
        "category": "NETWORK",
        "priority": "LOW"
    },
    {
        "title": "Dynamic DNS update failing for remote branch office gateway",
        "description": "Branch office router dynamic DNS client failed to update public IP on Cloudflare DNS after ISP reconnect.",
        "category": "NETWORK",
        "priority": "MEDIUM"
    },

    # ==================== ACCESS_IAM (25 samples) ====================
    {
        "title": "Corporate Active Directory domain password expired and locked out",
        "description": "My Windows login password expired over the weekend. Entered password too many times and now account is completely locked out. Need account unlocked and temporary password set.",
        "category": "ACCESS_IAM",
        "priority": "HIGH"
    },
    {
        "title": "Microsoft Authenticator MFA push notifications not received after phone replacement",
        "description": "Upgraded to a new iPhone yesterday. Corporate SSO login sends MFA push approval, but the prompt never arrives on the new device. Need MFA registration reset.",
        "category": "ACCESS_IAM",
        "priority": "HIGH"
    },
    {
        "title": "AWS IAM permission denied when uploading to production S3 bucket",
        "description": "Getting AccessDenied error when attempting to sync data artifacts to s3://prod-analytics-lakehouse. My IAM role is missing s3:PutObject permission.",
        "category": "ACCESS_IAM",
        "priority": "MEDIUM"
    },
    {
        "title": "Requesting read-only access to Salesforce Financial reporting dashboard",
        "description": "Starting new duties reviewing quarterly ARR metrics. Manager Marcus Vance approved access to Salesforce Finance Reports folder. Role needed: SFDC_Finance_Viewer.",
        "category": "ACCESS_IAM",
        "priority": "LOW"
    },
    {
        "title": "Okta SSO single sign-on redirect loop on internal portal",
        "description": "Navigating to portal.servicedesk.local redirects to Okta login, authenticates successfully, but immediately redirects back to Okta in an infinite loop.",
        "category": "ACCESS_IAM",
        "priority": "MEDIUM"
    },
    {
        "title": "GitHub Enterprise organization invitation link expired",
        "description": "The onboarding email invite to join the ServiceDesk-Pro GitHub organization has expired after 7 days. Need a fresh invite sent to developer email.",
        "category": "ACCESS_IAM",
        "priority": "LOW"
    },
    {
        "title": "New contractor onboarding: create email, Slack, and VPN accounts",
        "description": "New data engineering contractor starting on Monday. Requesting creation of domain account, Google Workspace mailbox, Slack channel access, and remote VPN credentials.",
        "category": "ACCESS_IAM",
        "priority": "MEDIUM"
    },
    {
        "title": "Jira and Confluence project permissions for QA testing team",
        "description": "The external QA testing contractor team cannot create bug tickets or edit test specification documentation in the ServiceDesk Pro Jira project.",
        "category": "ACCESS_IAM",
        "priority": "MEDIUM"
    },
    {
        "title": "Shared mailbox access delegation for finance accounts payable",
        "description": "Requesting Send As and Read permissions to shared mailbox invoices@servicedesk.local for newly hired accounts payable specialist.",
        "category": "ACCESS_IAM",
        "priority": "LOW"
    },
    {
        "title": "Sudo privileges on staging Kubernetes worker nodes",
        "description": "Need temporary root / sudo access on staging cluster worker node 10.240.2.14 to run packet capture diagnostics for memory leak investigation.",
        "category": "ACCESS_IAM",
        "priority": "MEDIUM"
    },
    {
        "title": "YubiKey hardware security key enrollment for privileged admin account",
        "description": "Configuring FIDO2 YubiKey for hardware-based multi-factor authentication on AWS root account and domain controller logins.",
        "category": "ACCESS_IAM",
        "priority": "MEDIUM"
    },
    {
        "title": "Revoke access permissions for departing employee effective today",
        "description": "Employee resignation effective 5 PM today. Please disable Active Directory account, revoke OAuth tokens, and terminate active Google sessions.",
        "category": "ACCESS_IAM",
        "priority": "HIGH"
    },
    {
        "title": "Azure AD conditional access policy blocking login from home office",
        "description": "Entra ID error: 'You cannot access this right now - Device must be Entra hybrid joined'. Hybrid join status needs sync.",
        "category": "ACCESS_IAM",
        "priority": "HIGH"
    },
    {
        "title": "Service account API key rotation for automated ETL data ingestion pipeline",
        "description": "Annual security compliance requires rotating AWS access keys and database service account credentials for service_etl_prod.",
        "category": "ACCESS_IAM",
        "priority": "LOW"
    },
    {
        "title": "Reset forgotten BitLocker recovery key for encrypted laptop drive",
        "description": "After a BIOS update, laptop booted into BitLocker recovery screen. User does not have the 48-digit recovery key saved.",
        "category": "ACCESS_IAM",
        "priority": "HIGH"
    },
    {
        "title": "Grant access to shared Google Drive folder for marketing campaign assets",
        "description": "Please add graphic designer to the 'Brand Strategy 2025' Google Shared Drive with Content Manager permissions.",
        "category": "ACCESS_IAM",
        "priority": "LOW"
    },
    {
        "title": "CRITICAL: Global domain administrator lockout on primary Active Directory forest",
        "description": "EMERGENCY: All domain admins are locked out of domain controller after misconfigured Kerberos ticketing policy. Administrative intervention required.",
        "category": "ACCESS_IAM",
        "priority": "CRITICAL"
    },
    {
        "title": "Requesting license assignment for Microsoft Power BI Pro workspace",
        "description": "Need Power BI Pro user license assigned in Microsoft 365 admin center to publish executive KPI dashboard.",
        "category": "ACCESS_IAM",
        "priority": "LOW"
    },
    {
        "title": "LDAP authentication failing on internal legacy wiki documentation portal",
        "description": "MediaWiki server throws 'Could not bind to LDAP server as anonymous or proxy user'. Active Directory bind account password may have changed.",
        "category": "ACCESS_IAM",
        "priority": "MEDIUM"
    },
    {
        "title": "PAM CyberArk privileged session manager gateway connection timeout",
        "description": "Engineers cannot check out root passwords from CyberArk vault due to gateway connection timeout error 504.",
        "category": "ACCESS_IAM",
        "priority": "HIGH"
    },
    {
        "title": "Figma enterprise organization user seat allocation request",
        "description": "Product manager requires Editor seat in Figma enterprise workspace to review user flow wireframes.",
        "category": "ACCESS_IAM",
        "priority": "LOW"
    },
    {
        "title": "SAML assertion expired error when authenticating to Datadog monitoring",
        "description": "Clock skew between identity provider and Datadog SAML consumer endpoint causes 'SAML Response has expired' message.",
        "category": "ACCESS_IAM",
        "priority": "MEDIUM"
    },
    {
        "title": "Requesting access to Databricks workspace data lake compute cluster",
        "description": "Data analyst needs cluster attach permission in Databricks workspace to query customer churn tables.",
        "category": "ACCESS_IAM",
        "priority": "LOW"
    },
    {
        "title": "Active Directory group membership synchronization to Google Workspace failing",
        "description": "GCDS (Google Cloud Directory Sync) log reports LDAP connection refused, preventing new email distribution group propagation.",
        "category": "ACCESS_IAM",
        "priority": "MEDIUM"
    },
    {
        "title": "Self-service password reset security questions reset request",
        "description": "User cannot recall security challenge answers for self-service portal after returning from parental leave.",
        "category": "ACCESS_IAM",
        "priority": "LOW"
    },

    # ==================== SECURITY (25 samples) ====================
    {
        "title": "CRITICAL: Suspicious phishing email with macro-enabled Word attachment received",
        "description": "EMERGENCY: Received an unexpected phishing email impersonating CEO requesting immediate wire transfer with an attached file 'urgent_invoice_q4.docm'. An employee in finance clicked the file before realizing it was suspicious. Potential ransomware execution.",
        "category": "SECURITY",
        "priority": "CRITICAL"
    },
    {
        "title": "CRITICAL: Microsoft Defender for Endpoint flagged trojan malware on marketing laptop",
        "description": "EMERGENCY: Antivirus alert: Defender detected Trojan:Win32/Wacatac.B!ml in C:\\Users\\Public\\Downloads\\installer.exe. File quarantined, need host isolation and forensic triage.",
        "category": "SECURITY",
        "priority": "CRITICAL"
    },
    {
        "title": "CRITICAL: Employee corporate laptop stolen from vehicle in parking garage",
        "description": "EMERGENCY: Company laptop stolen during vehicle break-in. Machine contains customer data and cached tokens. Requesting immediate remote BitLocker wipe and session revocation.",
        "category": "SECURITY",
        "priority": "CRITICAL"
    },
    {
        "title": "CRITICAL: Anomalous outbound SSH connection attempts to foreign IP address",
        "description": "EMERGENCY: SIEM alert: Production bastion host 10.240.0.8 initiated 450 repetitive outbound SSH sessions toward unknown IP 185.220.101.4 over non-standard port 4444. Breach suspected.",
        "category": "SECURITY",
        "priority": "CRITICAL"
    },
    {
        "title": "USB storage device blocked by endpoint DLP security policy",
        "description": "Attempted to plug in external USB thumb drive to copy training video presentation for conference. Windows notification: 'Removable storage access blocked by IT Security'.",
        "category": "SECURITY",
        "priority": "LOW"
    },
    {
        "title": "CRITICAL: Multiple brute-force failed login alerts on executive email account",
        "description": "EMERGENCY: Over 200 failed sign-in attempts recorded in Entra ID sign-in logs originating from multiple Tor exit nodes targeting VP executive account.",
        "category": "SECURITY",
        "priority": "CRITICAL"
    },
    {
        "title": "Security compliance questionnaire request for enterprise client RFP",
        "description": "Prospective enterprise banking customer sent their annual SOC 2 Type II and ISO 27001 vendor security assessment questionnaire. Requesting review from IT InfoSec.",
        "category": "SECURITY",
        "priority": "LOW"
    },
    {
        "title": "SSL/TLS certificate expiring in 7 days on customer-facing portal",
        "description": "Automated cert-manager alert: Wildcard SSL certificate *.servicedesk.local expires in 7 days. Need manual renewal and certificate chain re-installation on reverse proxies.",
        "category": "SECURITY",
        "priority": "HIGH"
    },
    {
        "title": "CRITICAL: Suspicious login from unfamiliar country on corporate Google account",
        "description": "EMERGENCY: Google Workspace security alert: Login detected from foreign country for employee located in Austin, TX. Impossible travel velocity detected. Reset credentials and revoke tokens.",
        "category": "SECURITY",
        "priority": "CRITICAL"
    },
    {
        "title": "DLP warning: Confidential client PII detected in outgoing email draft",
        "description": "Data Loss Prevention agent flagged an email draft containing 50 unredacted social security numbers intended for an external recipient.",
        "category": "SECURITY",
        "priority": "HIGH"
    },
    {
        "title": "Vulnerability scan detected open port 3389 RDP on public DMZ server",
        "description": "Tenable Nessus external security scan flagged exposed Remote Desktop Protocol port 3389 accessible to public internet on 198.51.100.45. Immediate firewall rule closure required.",
        "category": "SECURITY",
        "priority": "HIGH"
    },
    {
        "title": "CRITICAL: Ransomware note found on shared department network drive",
        "description": "EMERGENCY: Accounting shared SMB drive contains 'README_RESTORE_FILES.txt' and all spreadsheet files have extension '.locked'. Total ransomware encryption underway.",
        "category": "SECURITY",
        "priority": "CRITICAL"
    },
    {
        "title": "Employee reported receiving fake SMS smishing message pretending to be IT helpdesk",
        "description": "Several staff received text messages directing them to fake login portal servicedesk-login-portal.com to confirm their phone numbers.",
        "category": "SECURITY",
        "priority": "HIGH"
    },
    {
        "title": "CrowdStrike Falcon sensor uninstall request for legacy server decommission",
        "description": "Server decommission ticket: Requesting CrowdStrike maintenance token to cleanly uninstall Falcon sensor agent from retired VM.",
        "category": "SECURITY",
        "priority": "LOW"
    },
    {
        "title": "Git repository secret scanning alert: AWS access key committed to public repo",
        "description": "GitHub secret scanning detected AWS_SECRET_ACCESS_KEY committed in commit history of public repository. Key must be revoked immediately.",
        "category": "SECURITY",
        "priority": "HIGH"
    },
    {
        "title": "SQL injection vulnerability reported by whitehat penetration test team",
        "description": "Penetration test report identifies SQL injection vector on public API endpoint /api/v1/search parameter 'query'. Patch required.",
        "category": "SECURITY",
        "priority": "HIGH"
    },
    {
        "title": "Quarterly employee simulated phishing campaign performance report request",
        "description": "HR compliance team requests results of Q1 KnowBe4 simulated phishing drill, including click rates and report rates.",
        "category": "SECURITY",
        "priority": "LOW"
    },
    {
        "title": "Firewall policy exception request for external vendor remote support IP",
        "description": "Vendor needs temporary inbound SSH access from 203.0.113.15 to diagnostic server for hardware RMA debugging.",
        "category": "SECURITY",
        "priority": "LOW"
    },
    {
        "title": "CRITICAL: Data breach notification from third-party payroll SaaS provider",
        "description": "EMERGENCY: Cloud payroll vendor suffered unauthorized database exfiltration affecting our employee direct deposit records. Incident response plan activated.",
        "category": "SECURITY",
        "priority": "CRITICAL"
    },
    {
        "title": "Malicious browser extension detected on executive assistant PC",
        "description": "EDR agent flagged browser extension 'PDF Quick Converter' exfiltrating form keystrokes and cookies to foreign domain.",
        "category": "SECURITY",
        "priority": "HIGH"
    },
    {
        "title": "Security audit log retention configuration review for HIPAA compliance",
        "description": "Compliance team requesting verification that SIEM log retention meets 7-year regulatory archiving standards.",
        "category": "SECURITY",
        "priority": "LOW"
    },
    {
        "title": "DKIM and DMARC email authentication failing for corporate domain",
        "description": "Automated DMARC aggregate reports show 12% alignment failures for outbound marketing emails sent via SendGrid.",
        "category": "SECURITY",
        "priority": "MEDIUM"
    },
    {
        "title": "Suspicious scheduled cron job created under root user on web server",
        "description": "Host integrity monitoring detected unknown cron entry executing curl piping into /bin/sh every hour.",
        "category": "SECURITY",
        "priority": "HIGH"
    },
    {
        "title": "Requesting access to InfoSec vulnerability management dashboard",
        "description": "Lead DevOps engineer requests viewer role in Qualys cloud platform to track container image CVE patch status.",
        "category": "SECURITY",
        "priority": "LOW"
    },
    {
        "title": "CRITICAL: Distributed Denial of Service (DDoS) attack on main public website",
        "description": "EMERGENCY: Cloudflare reports 25 million SYN flood requests per second targeting primary edge router. Website timing out globally.",
        "category": "SECURITY",
        "priority": "CRITICAL"
    }
]

def get_training_data() -> Tuple[List[str], List[str], List[str]]:
    """
    Returns (texts, category_labels, priority_labels)
    combining title + description for rich NLP representation.
    """
    texts = []
    category_labels = []
    priority_labels = []

    for item in RAW_TRAINING_DATA:
        combined_text = f"{item['title']} {item['description']}"
        texts.append(combined_text)
        category_labels.append(item['category'])
        priority_labels.append(item['priority'])

    return texts, category_labels, priority_labels
