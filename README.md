# BUSMASTER 🚍
## Multi-Tenant SaaS Bus Booking, Counter Ticketing & Transport Management Platform

> Built with React, Vite, TypeScript, Tailwind CSS, and Supabase PostgreSQL. Designed for high-scale multi-tenancy, segment-based inventory, and bus counter operations across Bangladesh.

---

## 🎯 Master Architecture Highlights

- **Multi-Tenant SaaS**: Complete isolation of operators at the PostgreSQL Row Level Security (RLS) and application tier. One central platform serving multiple independent bus operators (Green Line, Hanif Enterprise, Shohag Paribahan, etc.).
- **Updated Master Access Authority**:
  - **Super Admin**: Highest-level authority in the platform. Unrestricted global access to all registered bus companies, all operational portals, fleet, routes, trips, bookings, finances, and system settings.
  - **Company Owner**: Full administrative authority within their own company. Access to all company portals (Owner Dashboard, Counter Manager, Counter POS, Driver, Supervisor, Support) with an instant **Company Portal Switcher**.
  - **Role-Specific Access**: Counter Managers, Counter Agents, Supervisors, and Drivers have dedicated role-based portals with least-privilege boundaries.
- **Advanced Segment-Based Seat Inventory**:
  - Supports continuous multi-stop routes (e.g., *Dhaka → Cumilla → Feni → Chattogram*).
  - The same seat (e.g. `A1`) can be booked by Passenger 1 (*Dhaka → Cumilla*), Passenger 2 (*Cumilla → Feni*), and Passenger 3 (*Feni → Chattogram*) without conflict because their journey segments do not overlap!
  - Overlapping bookings (*Dhaka → Chattogram* vs *Dhaka → Cumilla*) are atomically detected and blocked.
- **Physical Bus Counter Ticketing & POS**:
  - Rapid counter booking interface.
  - Cash drawer shift sessions & cash reconciliation.
  - Direct ticket printing in 3 selectable formats: **Standard Ticket**, **80mm Thermal Receipt Printer format**, and **A4 Official Journey Receipt**.
- **Customer Online Booking Website**:
  - Responsive public portal with real-time seat selection, checkout, and instant QR Code ticket generation.
- **QR Boarding Verification & Anti-Duplicate Protection**:
  - Station supervisor scanner validates tickets and prevents duplicate boarding.
- **Bangladesh-Ready Defaults**:
  - Currency: BDT (৳)
  - Timezone: Asia/Dhaka
  - Date format: DD-MM-YYYY
  - Phone validation: Bangladesh mobile (+880 1...)

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 20+
- npm or yarn

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Provide your Supabase URL and Anon key when connecting to your cloud or local Docker Supabase instance:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```
*(Note: BUSMASTER includes a self-bootstrapping offline / local storage demonstration engine with full seed data for Green Line, Hanif, and Shohag, allowing development and testing without mandatory cloud subscriptions).*

### 3. Database Migrations
Run the schema migrations in Supabase SQL editor or via Supabase CLI:
```bash
supabase db push
# or run the SQL in: supabase/migrations/20261031000001_initial_busmaster_schema.sql
# and seed data in: supabase/seed/seed_data.sql
```

### 4. Run Development Server
```bash
npm install
npm run dev
```

### 5. Run Automated Tests
Verify segment inventory, atomic booking, duplicate boarding rejection, and refund calculations:
```bash
node tests/verify-busmaster.cjs
```

---

## 👥 Role Testing Personas

You can switch personas and roles instantly from the top navigation bar:
- **👑 Super Admin**: Tariqul Islam (`admin@busmaster.com`)
- **🏢 Green Line Owner**: Mohammad Alauddin (`owner@greenline.bd`)
- **📋 Counter Manager**: Kabir Hossain (`manager.arambagh@greenline.bd`)
- **🎫 Counter Agent**: Sumon Mia (`agent1@greenline.bd`)
- **🚌 Senior Driver**: Abul Kalam (`driver.kalam@greenline.bd`)
- **👁️ Station Supervisor**: Rafiqul Islam (`supervisor.rafiq@greenline.bd`)
- **🧑 Passenger**: Tanvir Ahmed (`customer@example.com`)
