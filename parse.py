import requests

# URL of the webpage you want to save
url = 'https://everynoise.com/engenremap-brooklynindie.html'

# Send a GET request to fetch the HTML content
response = requests.get(url)

# Save the HTML content to a file
with open('webpage.html', 'w', encoding='utf-8') as file:
    file.write(response.text)
