# Blog-gator

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-ISC-lightgrey)

A powerful command-line RSS feed aggregator.

## Description

Blog-gator is a CLI tool that allows you to aggregate, read, and manage your favorite RSS feeds directly from your terminal. It's built for developers, content creators, and news junkies who want a fast, keyboard-driven way to keep up with the latest content.

This project solves the problem of ever-increasing browser tabs and the need to visit multiple websites for updates. With Blog-gator, you can consolidate your reading list into one place and browse it efficiently.

### Key Features

- **User Authentication:** Secure registration and login for personalized feed management.
- **Feed Management:** Add, list, follow, and unfollow RSS feeds.
- **Content Aggregation:** Fetches and stores the latest posts from your followed feeds.
- **Terminal-Based Browsing:** Read articles and browse your feeds without leaving the command line.
- **Extensible Command System:** Easily add new functionality and commands.

## Table of Contents

- [Blog-gator](#blog-gator)
  - [Description](#description)
    - [Key Features](#key-features)
  - [Table of Contents](#table-of-contents)
  - [Installation](#installation)
    - [Prerequisites](#prerequisites)
    - [Instructions](#instructions)
  - [Quick Start / Usage](#quick-start--usage)
  - [Commands](#commands)
  - [Configuration](#configuration)
  - [Development](#development)
    - [Setting up the Development Environment](#setting-up-the-development-environment)
    - [Running Tests](#running-tests)
    - [Building the Project](#building-the-project)
  - [Contributing](#contributing)
  - [Testing](#testing)
  - [License](#license)
  - [Authors \& Acknowledgments](#authors--acknowledgments)

## Installation

### Prerequisites

- Node.js (v18 or higher recommended, see `.nvmrc`)
- npm
- PostgreSQL database

### Instructions

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/blog-gator.git
    cd blog-gator
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up your environment:**
    Create a `.env` file in the root of the project and add your database connection string. See the [Configuration](#configuration) section for more details.

4.  **Run database migrations:**
    ```bash
    npm run db:migrate
    ```

5.  **Verify installation:**
    You can start the application by running:
    ```bash
    npm start
    ```
    This should show the basic usage help message.

## Quick Start / Usage

Blog-gator is operated via a series of commands. Here’s a quick tour of how to get started.

1.  **Register a new user:**
    ```bash
    npm start register <username> <password>
    ```

2.  **Log in:**
    ```bash
    npm start login <username> <password>
    ```
    A session token will be created for you.

3.  **Add a feed:**
    ```bash
    npm start addfeed <feed-url>
    ```
    Example: `npm start addfeed https://example.com/rss.xml`

4.  **Follow a feed:**
    ```bash
    npm start follow <feed-id>
    ```
    You can get the `<feed-id>` by running `npm start feeds`.

5.  **Aggregate posts:**
    ```bash
    npm start agg
    ```
    This fetches the latest posts from all feeds.

6.  **Browse your followed feeds:**
    ```bash
    npm start browse
    ```

## Commands

Here are the available commands:

-   `register <username> <password>`: Create a new user account.
-   `login <username> <password>`: Log in to your account.
-   `users`: List all registered users.
-   `reset`: Deletes all users (admin-only).
-   `addfeed <url>`: Add a new RSS feed to the system.
-   `feeds`: List all available feeds.
-   `follow <feed-id>`: Follow a feed.
-   `unfollow <feed-id>`: Unfollow a feed.
-   `following`: List all the feeds you are following.
-   `agg`: Aggregate new posts from all feeds.
-   `browse`: Browse posts from your followed feeds.

## Configuration

The application is configured via environment variables. Create a `.env` file in the project root.

```
# .env file
DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/<database>"
```

-   `DATABASE_URL`: The connection string for your PostgreSQL database.

## Development

### Setting up the Development Environment

Follow the [Installation](#installation) instructions to set up the basic environment.

### Running Tests

There is no test suite set up yet. To run the placeholder test script:
```bash
npm test
```

### Building the Project

The project is run on-the-fly with `tsx`. You can also build it with `tsc`.
```bash
npm run typecheck
```

## Contributing

Contributions are welcome! Please open an issue to discuss your ideas or submit a pull request.

(You can add a `CONTRIBUTING.md` file with more detailed guidelines).

## Testing

The project currently lacks a dedicated testing framework. This is a great area for contribution!

## License

This project is licensed under the ISC License. See the `LICENSE` file for details.

## Authors & Acknowledgments

-   This project was created by the Tim DeHof.
-   Thanks to the creators of Drizzle ORM, Winston, and other open-source libraries used.
