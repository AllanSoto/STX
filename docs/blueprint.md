# **App Name**: SimulTradex

## Core Features:

- Dashboard Display: Displays the current value of BTC, ETH, SOL, BNB, and XRP in a clean, readable format.
- Order Simulator: Allows users to select a cryptocurrency, input buy and sell values, and automatically calculates the commission and net profit/loss.
- Trend Indicator: Using simple AI analysis of recent price movements, indicate visual trends for each displayed cryptocurrency, signifying if each one is currently trending up or down. Use of tool by the LLM.
- Opportunity Simulator: Provides a list of simulated trades with incrementally increasing profit percentages, using real-time prices to suggest potential opportunities. This will be calculated with real prices from Binance.
- User Account Management: Provide options for user account and password management, including strong validation, session saving, and login.
- Binance API Connection: After logging in, prompt the user for a Binance API key to connect the app. Show a checkmark and 'Connected' on success, or an X and an error message on failure. This API provides the data.
- Language Selection: Provides a menu button for changing the app's language (English, Spanish, French, Hindi, Chinese) and logging out (disconnecting Binance API but not deleting the user).
- Back Button Interaction: Enables the app to use the phone's back button to navigate to the previous screen.
- Save Simulations: Simulated trades are saved with date, commission, crypto, profit/loss data.

## Style Guidelines:

- Primary color: Use shades of green (#4CAF50) for buy signals and a generally positive and optimistic feel.
- Use shades of red (#F44336) for sell signals to create negative associations with possible loses.
- Accent: Use shades of purple (#9C27B0) to differentiate between CTAs and highlights, maintaining clear call to action.
- Use a dark mode theme to make data more readable and prevent eye strain during long usage periods.
- Use simple, modern icons to represent different cryptocurrencies and actions within the app.