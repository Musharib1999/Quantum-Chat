import yfinance as yf

try:
    ticker = yf.Ticker("AAPL")
    data = ticker.history(period="1d", interval="1m")
    if data.empty:
        print("Error: No data returned. Yahoo Finance might be blocking or market is closed/data unavailable for this interval.")
    else:
        print("Success! Data retrieved:")
        print(data.tail())
except Exception as e:
    print(f"Error occurred: {e}")
