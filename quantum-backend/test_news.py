from pygooglenews import GoogleNews

def test_news():
    print("Initializing GoogleNews...")
    gn = GoogleNews(lang='en', country='US')
    
    keyword = 'quantum computing OR "quantum technology" OR "quantum algorithms"'
    print(f"Searching for: {keyword}")
    results = gn.search(keyword)
    
    print(f"Found {len(results.get('entries', []))} entries. Showing top 5:")
    print("="*40)
    for entry in results.get('entries', [])[:5]:
        print(f"TITLE: {entry.title}")
        print(f"LINK: {entry.link}")
        print(f"PUBLISHED: {entry.published}")
        print("-" * 40)

if __name__ == "__main__":
    try:
        test_news()
    except Exception as e:
        print(f"Error occurred: {e}")
