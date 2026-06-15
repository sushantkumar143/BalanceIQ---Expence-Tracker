# BalanceIQ Frontend

The frontend of BalanceIQ provides a sleek, professional, and dynamic user interface for managing shared expenses, importing CSV files, and viewing graphical analytics.

## 🛠️ Technology Stack
- **Framework:** React 18 + Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS + Custom glass-card utilities (Light Theme)
- **Animations:** Framer Motion
- **State Management:** `@tanstack/react-query`
- **Charts/Analytics:** Recharts
- **Icons:** Lucide React

## 📁 Project Structure
- `src/components/`: Reusable UI components (layout wrappers, empty states).
- `src/pages/`: Main application views:
  - `Landing.tsx`: Public marketing page.
  - `auth/`: Login and Registration flows.
  - `Dashboard.tsx`: Central hub for groups and quick actions.
  - `groups/`: Group detail views, member management, and `AnalyticsTab.tsx`.
  - `import/`: The multi-step `ImportWizard.tsx` for CSV ingestion and anomaly resolution.
- `src/services/`: API client configuration (`api.ts`).
- `src/lib/`: Utility functions (`utils.ts`).

## 🚀 Quick Start

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Run Development Server:**
   ```bash
   npm run dev
   ```

3. **Build for Production:**
   ```bash
   npm run build
   ```

The local development server will be available at `http://localhost:5173`.
