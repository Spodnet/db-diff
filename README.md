# DB-Diff: Database Comparison & Merging Tool

**DB-Diff** is a modern, web-based utility designed to visually compare and synchronize data between databases. Built with a focus on usability and developer experience, it allows for easy row-by-row comparison, cell-level difference highlighting, and selective merging of data.

Please note this app was vibe coded with antigravity, the code is not security audited and should only be used in a non-production setting. The code quality is typical of vibe coded output and will be improved over time. It's also missing tests, the agent obviously missed that step despite early instructions saying it should be included.

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
  - **Right-click on modified rows** to "Mark as New Row" - inserts as a new record instead of updating, with the abilty cascade the id and duplicate existing linked rows.
- **Data Explorer**: distinct views to browse and inspect raw table data for any connected database.
- **Modern Architecture**: Built with **React 19**, **Tailwind CSS v4**, and **Express**.

## 💡 Tips

- **Double-click** a row to select it for merging.
- **Click** a modified cell to merge just that cell's value.
- **Right-click** a modified row to access context menu options like "Mark as New Row".
- Use the **filter toggles** in the stats bar to show/hide rows by status (Added, Deleted, Modified, Unchanged).

## 🛠️ Technology Stack

- **Frontend**: [React 19](https://react.dev/), [Vite](https://vitejs.dev/), [Tailwind CSS v4](https://tailwindcss.com/)
- **Backend**: [Express](https://expressjs.com/)
- **Database Drivers**:
  - `better-sqlite3` for SQLite
  - `mysql2` for MySQL
- **UI Components**: [Radix UI](https://www.radix-ui.com/), [Lucide React](https://lucide.dev/) (Icons)

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v24 or higher recommended)
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

- **Frontend**: Access the UI at `http://localhost:5173` (or your configured PORT see below)
- **Backend API**: Server runs on `http://localhost:3001` (or your configured PORT see below)

### Configuration

To avoid port conflicts or customize the server port, you can use a `.env` file.

1.  Copy the example file:
    ```bash
    cp .env.example .env
    ```
2.  Edit `.env` and set your desired `PORT` (default is 3001).
    ```env
    PORT=3005
    UI_PORT=5174
    ```
    - `PORT`: The port for the backend API server.
    - `UI_PORT`: The port for the frontend application (default 5173).

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
