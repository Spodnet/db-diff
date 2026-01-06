# DB-Diff: Database Comparison & Merging Tool

**DB-Diff** is a modern, web-based utility designed to visually compare and synchronize data between databases. Built with a focus on usability and developer experience, it allows for easy row-by-row comparison, cell-level difference highlighting, and selective merging of data.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## ✨ Key Features

- **Multi-Database Support**: Connect to and diff between **SQLite** and **MySQL** databases.
- **Visual Data Diffing**:
  - **Row-level Comparison**: Instantly see Added, Deleted, and Modified rows.
  - **Cell-level Precision**: Highlight specific column changes within modified rows.
- **Smart Merging**:
  - Selectively merge changes from a source database to a target database.
  - Supports **INSERT**, **UPDATE**, and **DELETE** operations.
  - Granular control: merge entire rows or individual cell modifications.
- **Data Explorer**: distinct views to browse and inspect raw table data for any connected database.
- **Modern Architecture**: Built with **React 19**, **Tailwind CSS v4**, and **Express**.

## 🛠️ Technology Stack

- **Frontend**: [React 19](https://react.dev/), [Vite](https://vitejs.dev/), [Tailwind CSS v4](https://tailwindcss.com/)
- **Backend**: [Express](https://expressjs.com/)
- **Database Drivers**:
  - `better-sqlite3` for SQLite
  - `mysql2` for MySQL
- **UI Components**: [Radix UI](https://www.radix-ui.com/), [Lucide React](https://lucide.dev/) (Icons)

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm` or `yarn`

### Installation

1.  Clone the repository:

    ```bash
    git clone https://github.com/yourusername/db-diff.git
    cd db-diff
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

### Running the Application

Start both the client and server concurrently with a single command:

```bash
npm run dev
```

- **Frontend**: Access the UI at `http://localhost:5173`
- **Backend API**: Server runs on `http://localhost:3001`

### Development Commands

- `npm run dev:client`: Start only the Vite frontend.
- `npm run dev:server`: Start only the Express backend.
- `npm run lint`: Run Biome linting.
- `npm run format`: Format code with Biome.
- `npm run test`: Run tests with Vitest.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.
