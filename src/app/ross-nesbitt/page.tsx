// src/app/ross-nesbitt/page.tsx
'use client'; 

import React from 'react';
import Link from 'next/link';

// Import Lucide React icons
import { 
  User, ClipboardList, Network, Code, Cloud, Terminal, Lightbulb, 
  GraduationCap, Briefcase, Github, Cpu, Book, Users, Rocket,
  MapPin, Mail, Phone, Sparkles 
} from 'lucide-react'; 

// Note: metadata is NOT exported here for client components. 
// This is handled by the root layout.tsx or a dedicated metadata file.

export default function RossNesbittPage() {
  return (
    <div className="container mx-auto px-4 py-8 md:px-8">
      <div className="max-w-4xl mx-auto"> 

        {/* Header Section: Name, Title, Contact */}
        <header className="text-center mb-12 bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-8 rounded-lg shadow-xl">
          <h1 className="text-5xl md:text-6xl font-extrabold mb-4 drop-shadow-md">
            <span className="inline-block text-6xl animate-pulse">👨‍💻</span> Ross Nesbitt
          </h1>
          <p className="text-xl md:text-3xl font-light mb-4">
            Senior IT-OT Infrastructure & Operations Specialist
          </p>
          <div className="text-indigo-100 text-base md:text-lg space-y-1">
            <p className="flex items-center justify-center">
              <Phone className="w-5 h-5 mr-2" /> 408.771.6351
            </p>
            <p className="flex items-center justify-center">
              <Mail className="w-5 h-5 mr-2" />
              <a href="mailto:rossnesbitt@gmail.com" className="text-blue-200 hover:underline">
                rossnesbitt@gmail.com
              </a>
            </p>
            <p className="flex items-center justify-center">
              <Github className="w-5 h-5 mr-2" />
              <a href="https://github.com/hapnesbitt" target="_blank" rel="noopener noreferrer" className="text-blue-200 hover:underline">
                github.com/hapnesbitt
              </a>
            </p>
            <p className="flex items-center justify-center">
              <MapPin className="w-5 h-5 mr-2" /> Fort Collins, CO 80522
            </p>
          </div>
        </header>

        {/* Professional Summary */}
        <section className="mb-12">
          <div className="bg-white p-8 lg:p-12 rounded-lg shadow-2xl border border-gray-100">
            <h2 className="text-center text-4xl font-extrabold text-gray-800 mb-6">
              <User className="inline-block w-10 h-10 mr-3 text-blue-600" /> Professional Summary
            </h2>
            <p className="text-lg text-gray-700 leading-relaxed">
              Highly experienced Senior IT-OT Infrastructure & Operations Specialist with over 25 years of expertise in managing, maintaining, and securing complex IT/OT systems within GMP-compliant (including 21 CFR Part 11 principles) and other highly regulated manufacturing and laboratory environments. Proven ability in overseeing IT infrastructure (servers, networks, personal computing devices), ensuring operational integrity, automating routine tasks (Python, Bash, Perl), and providing expert technical support for both lab and GxP manufacturing equipment. Deep understanding of IT network and security fundamentals, compliance documentation, and collaborating with global teams and suppliers to resolve critical issues. Adept at troubleshooting complex system software and hardware problems with minimal guidance.
            </p>
          </div>
        </section>

        <hr className="my-12 border-t-2 border-gray-300" />

        {/* Technical Skills */}
        <section className="mb-12 bg-blue-50 p-8 md:p-12 rounded-lg shadow-xl">
          <h2 className="text-center text-4xl font-extrabold text-gray-800 mb-10">
            <Code className="inline-block w-10 h-10 mr-3 text-blue-600" /> Technical Skills
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 text-gray-700">
            <div className="bg-white h-full p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300">
              <h3 className="font-semibold text-xl mb-3 text-gray-800 flex items-center">
                <Network className="w-7 h-7 mr-2 text-indigo-500" /> IT-OT Operations & Infrastructure Management:
              </h3>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>Installation, Configuration, Maintenance (Servers: Linux/Windows; Personal Computing Devices)</li>
                <li>GxP Manufacturing & Laboratory IT/OT Systems Support</li>
                <li>Operational Integrity, Performance Monitoring (Nagios, Splunk, Grafana), Backup & Restore</li>
                <li>Troubleshooting (Hardware, Software, Networked Systems, Field Device connectivity concepts)</li>
                <li>Industrial Automation Infrastructure Support (PLC connectivity & networking concepts)</li>
              </ul>
            </div>
            <div className="bg-white h-full p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300">
              <h3 className="font-semibold text-xl mb-3 text-gray-800 flex items-center">
                <ClipboardList className="w-7 h-7 mr-2 text-green-600" /> Compliance, Validation & Quality:
              </h3>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>GMP (Good Manufacturing Practice) & GxP Environments</li>
                <li>21 CFR Part 11 Compliance Requirements (Principles & Application)</li>
                <li>SOP Adherence, Change Management, Rigorous Documentation Standards</li>
                <li>System Validation & Verification (V&V) Principles</li>
                <li>Audit Support (Internal & External)</li>
              </ul>
            </div>
            <div className="bg-white h-full p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300">
              <h3 className="font-semibold text-xl mb-3 text-gray-800 flex items-center">
                <Cloud className="w-7 h-7 mr-2 text-red-600" /> Networking & Security:
              </h3>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>TCP/IP, DNS, DHCP, Firewalls (iptables, ACLs), Network Segmentation</li>
                <li>IT Security Protocols, Vulnerability Assessment Concepts, Data Integrity, DLP</li>
                <li>Proofpoint (TPRS, SER, DLP), Email Authentication (DMARC, SPF, DKIM)</li>
                <li>tcpdump, Wireshark for troubleshooting</li>
                <li>IDS/IPS (Snort)</li>
              </ul>
            </div>
            <div className="bg-white h-full p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300">
              <h3 className="font-semibold text-xl mb-3 text-gray-800 flex items-center">
                <Terminal className="w-7 h-7 mr-2 text-purple-600" /> Automation & Scripting:
              </h3>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>Python, Bash, Perl, PowerShell, VBS</li>
                <li><Link href="/batches" className="text-blue-600 hover:underline">Lightbox Project</Link> (Python/Flask, Celery, Redis for media processing backend)</li>
                <li>Shell scripting for server administration and task automation (e.g., systemd service management)</li>
              </ul>
            </div>
            <div className="bg-white h-full p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300">
              <h3 className="font-semibold text-xl mb-3 text-gray-800 flex items-center">
                <Cpu className="w-7 h-7 mr-2 text-orange-500" /> Operating Systems & Virtualization:
              </h3>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>Linux (Expert: RHEL, CentOS, Ubuntu, Debian), Windows Server, UNIX, Solaris</li>
                <li>VMware (ESX, KVM)</li>
                <li><Link href="/batches" className="text-blue-600 hover:underline">Lightbox Project</Link> (Dockerized deployment using Compose, principles for Kubernetes)</li>
              </ul>
            </div>
            <div className="bg-white h-full p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300">
              <h3 className="font-semibold text-xl mb-3 text-gray-800 flex items-center">
                <Lightbulb className="w-7 h-7 mr-2 text-yellow-500" /> Databases, Web Servers & Tools:
              </h3>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>MySQL/MariaDB, Oracle, Apache, Nginx, LDAP</li>
                <li>Jira, Confluence, OpenSSL, ServiceNow</li>
                <li><Link href="/batches" className="text-blue-600 hover:underline">Lightbox Project</Link> (Redis for primary data store & Celery broker/backend)</li>
              </ul>
            </div>
          </div>
        </section>

        <hr className="my-12 border-t-2 border-gray-300" />

        {/* Professional Experience */}
        <section className="mb-12">
          <h2 className="text-center text-4xl font-extrabold text-gray-800 mb-10">
            <Briefcase className="inline-block w-10 h-10 mr-3 text-blue-600" /> Professional Experience
          </h2>

          {/* Contract Engagements */}
          <h3 className="text-2xl font-semibold text-gray-700 mb-6 pb-2 border-b-2 border-gray-200 flex items-center justify-center">
            <Rocket className="w-8 h-8 mr-2 text-blue-500" /> Recent Hands-On Contract Engagements
          </h3>
          <ul className="space-y-6">
            <li className="p-6 bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300">
              <p className="font-bold text-xl text-gray-800">Senior Solutions Architect (DLP & Email Security Focus) | Wells Fargo</p>
              <p className="text-gray-600 italic mb-3">Jan 2024 – May 2025</p>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>Led enterprise-wide Data Loss Prevention (DLP) and DMARC remediation initiatives, architecting and implementing solutions that ensure compliance with stringent financial industry security policies and regulatory standards (analogous to GxP data integrity and documentation principles).</li>
                <li>Architected and implemented Proofpoint Trusted Party Relay Service (TPRS) and Proofpoint Secure Email Relay (SER) solutions to enhance secure and compliant email communication across diverse IT infrastructure.</li>
                <li>Developed advanced SMTP routing configurations for cloud, SaaS, and on-premises applications, optimizing secure data flow and enforcing security policies, requiring rigorous adherence to documented change management processes.</li>
                <li>Strengthened email authentication (SPF, DKIM, DMARC) and optimized Proofpoint firewall rules and configurations to prevent data exfiltration and improve system efficiency, crucial for maintaining operational integrity.</li>
                <li>Streamlined email security operations using ServiceNow for automated provisioning and incident management, maintaining detailed records for auditability and compliance verification.</li>
                <li>Collaborated with cross-functional teams to refine email security policies, ensuring alignment with evolving industry best practices and compliance requirements.</li>
              </ul>
            </li>
            <li className="p-6 bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300">
              <p className="font-bold text-xl text-gray-800">Email Security Architect | Graphic Packaging Inc.</p>
              <p className="text-gray-600 italic mb-3">Jun 2022 – Sept 2023</p>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>Managed email security infrastructure within a manufacturing environment with stringent quality standards for packaging materials, requiring adherence to robust operational procedures.</li>
                <li>Ensured security configurations and migrations complied with internal quality control processes and security policies relevant to a regulated industry supplier.</li>
              </ul>
            </li>
            <li className="p-6 bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300">
              <p className="font-bold text-xl text-gray-800">Systems Engineer / DR Planning & Testing | Morgan Stanley</p>
              <p className="text-gray-600 italic mb-3">Jun 2021 – Jan 2022</p>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>Planned and executed MySQL database migrations, focusing on data integrity, security, and validated post-migration operational status.</li>
                <li>Developed DR runbooks detailing secure operational procedures and validation steps for critical infrastructure.</li>
              </ul>
            </li>
            <li className="p-6 bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300">
              <p className="font-bold text-xl text-gray-800">Technical Analyst | TRACE3</p>
              <p className="text-gray-600 italic mb-3">Jul 2020 – Jan 2021</p>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>Authored Runbooks for critical applications, ensuring comprehensive documentation of IT processes, procedures, and configurations for operational stability and audit readiness.</li>
              </ul>
            </li>
            <li className="p-6 bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300">
              <p className="font-bold text-xl text-gray-800">Application Support Engineer | USDA (U.S. Department of Agriculture)</p>
              <p className="text-gray-600 italic mb-3">Aug 2019 – Jul 2020</p>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>Supported IT/OT systems (servers, Kubernetes clusters, applications) within a highly regulated environment focused on national food safety, adhering to principles mirroring GMP and 21 CFR Part 11 for data integrity, system validation, and audit trails.</li>
                <li>Developed and implemented monitoring scripts (Xymon, SmartBear, Bash, PowerShell) to ensure operational integrity and validate system performance against stringent compliance standards.</li>
                <li>Performed validated upgrades and patching of servers and applications, adhering to strict change management protocols and maintaining comprehensive documentation.</li>
                <li>Managed LDAP server integrations, ensuring secure and reliable authentication for critical systems.</li>
              </ul>
            </li>
            <li className="p-6 bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300">
              <p className="font-bold text-xl text-gray-800">Customer Satisfaction Engineer | Roostify</p>
              <p className="text-gray-600 italic mb-3">Mar 2017 – Aug 2019</p>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>Managed performance and security of a SaaS application, including monitoring system health, troubleshooting complex issues, and automating routine operational tasks.</li>
              </ul>
            </li>
          </ul>

          {/* Core Professional Experience */}
          <h3 className="text-2xl font-semibold text-gray-700 mb-6 mt-10 pb-2 border-b-2 border-gray-200 flex items-center justify-center">
            <Users className="w-8 h-8 mr-2 text-purple-600" /> Core Professional Experience
          </h3>
          <ul className="space-y-6">
            <li className="p-6 bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300">
              <p className="font-bold text-xl text-gray-800">Team Lead & Senior Technical Support Engineer | Proofpoint</p>
              <p className="text-gray-600 italic mb-3">Oct 2004 – Jan 2017</p>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>Oversaw operations of a large fleet of Linux-based security appliances, involving installation, configuration, maintenance, and troubleshooting of hardware and software in multi-user server environments.</li>
                <li>Led hardware migrations and comprehensive OS upgrades (32-bit to 64-bit Linux), ensuring operational integrity, minimal disruption, and validated post-migration functionality.</li>
                <li>Developed automation scripts (Bash, Perl) for routine maintenance, monitoring, and deployment tasks, enhancing efficiency.</li>
                <li>Authored extensive technical documentation, runbooks, and procedures for IT operations and support.</li>
              </ul>
            </li>
            <li className="p-6 bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300">
              <p className="font-bold text-xl text-gray-800">Senior Systems Administrator | Teraoptic Networks</p>
              <p className="text-gray-600 italic mb-3">Apr 2001 – Oct 2004</p>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>Managed and maintained critical IT/OT infrastructure for a precision electronics (chip development) R&D and GxP-aligned manufacturing environment, operating under stringent quality controls adhering to GMP principles and 21 CFR Part 11 concepts.</li>
                <li>Oversaw installation, configuration, and maintenance of IT systems software and hardware (Solaris, Linux, Windows servers; specialized lab equipment connectivity) supporting chip design, fabrication simulation, and testing processes.</li>
                <li>Ensured operational integrity, performance, and security of infrastructure, providing backup and monitoring services (BigBrother, Snort).</li>
                <li>Automated routine tasks using scripting to enhance efficiency in a controlled environment.</li>
                <li>Served as a primary point of contact for IT-related issues, troubleshooting complex problems in analytical labs and manufacturing-support environments.</li>
                <li>Adhered to rigorous documentation standards for system configurations, change management, incident response, and RCA reports, essential for GMP compliance and audit readiness.</li>
              </ul>
            </li>
            <li className="p-6 bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300">
              <p className="font-bold text-xl text-gray-800">Senior Network Engineer | Hostcentric</p>
              <p className="text-gray-600 italic mb-3">Jul 2000 – Apr 2001</p>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>Managed and maintained network infrastructure for a large hosting environment, including installation, configuration, and troubleshooting of networking hardware and software.</li>
                <li>Developed scripts for automating network monitoring and maintenance tasks.</li>
              </ul>
            </li>
          </ul>

          {/* Additional Earlier Experience */}
          <h3 className="text-2xl font-semibold text-gray-700 mb-6 mt-10 pb-2 border-b-2 border-gray-200 flex items-center justify-center">
            <Book className="w-8 h-8 mr-2 text-green-600" /> Additional Earlier Experience
          </h3>
          <ul className="space-y-6">
            <li className="p-6 bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300">
              <p className="font-bold text-xl text-gray-800">UNIX System Administrator | Health Systems Design, Inc.</p>
              <p className="text-gray-600 italic">Oct 1998 – Jul 2000</p>
            </li>
            <li className="p-6 bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300">
              <p className="font-bold text-xl text-gray-800">UNIX Software Specialist | Handmade Software, Inc.</p>
              <p className="text-gray-600 italic">Jul 1995 – Oct 1998</p>
            </li>
            <li className="p-6 bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300">
              <p className="font-bold text-xl text-gray-800">UNIX Software Specialist | ENCAD, Inc.</p>
              <p className="text-gray-600 italic">Sept 1993 – Jul 1995</p>
            </li>
          </ul>

          {/* Early Career Experience */}
          <h3 className="text-2xl font-semibold text-gray-700 mb-6 mt-10 pb-2 border-b-2 border-gray-200 flex items-center justify-center">
            <GraduationCap className="w-8 h-8 mr-2 text-orange-500" /> Early Career Experience
          </h3>
          <ul className="space-y-6">
            <li className="p-6 bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300">
              <p className="font-bold text-xl text-gray-800">Instructor, SQL | San Marcos State University</p>
              <p className="text-gray-600 italic">Jul 1993 – Sept 1993</p>
            </li>
            <li className="p-6 bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300">
              <p className="font-bold text-xl text-gray-800">Software Specialist | Blue Sky Software</p>
              <p className="text-gray-600 italic">Dec 1992 – Aug 1993</p>
            </li>
            <li className="p-6 bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300">
              <p className="font-bold text-xl text-gray-800">Software Specialist | Ansier Technologies</p>
              <p className="text-gray-600 italic">Jun 1991 – Jan 1992</p>
            </li>
          </ul>
        </section>

        <hr className="my-12 border-t-2 border-gray-300" />

        {/* Education */}
        <section className="mb-12 bg-purple-50 p-8 md:p-12 rounded-lg shadow-xl">
          <h2 className="text-center text-4xl font-extrabold text-gray-800 mb-10">
            <GraduationCap className="inline-block w-10 h-10 mr-3 text-purple-600" /> Education
          </h2>
          <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300">
            <p className="font-bold text-xl text-gray-800">University of California San Diego | Dec. 10, 1994</p>
            <p className="text-gray-700">Bachelor of Arts, General Literature (Harold E. Nesbitt III)</p>
          </div>
        </section>

        <hr className="my-12 border-t-2 border-gray-300" />

        {/* Concluding Philosophy & Links */}
        <section className="text-center mb-12">
          <p className="text-lg italic text-gray-700 leading-relaxed mb-8">
            <Sparkles className="inline-block w-6 h-6 mr-2 text-yellow-500" />
            Ross combines technical depth with a creative spirit (and a fondness for dancing dogs!), 
            making him a valuable asset in developing and operationalizing sophisticated software solutions.
          </p>

          <div className="flex flex-col md:flex-row justify-center space-y-4 md:space-y-0 md:space-x-4">
            <Link href="/about" className="inline-flex items-center px-8 py-4 bg-gray-700 text-white text-xl font-bold rounded-lg shadow-lg hover:bg-gray-800 transform hover:scale-105 transition-all duration-300">
              <Lightbulb className="w-6 h-6 mr-3" /> Back to About Froogle Lightbox
            </Link>
            <Link href="/" className="inline-flex items-center px-8 py-4 bg-blue-600 text-white text-xl font-bold rounded-lg shadow-lg hover:bg-blue-700 transform hover:scale-105 transition-all duration-300">
              <ClipboardList className="w-6 h-6 mr-3" /> Home
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
