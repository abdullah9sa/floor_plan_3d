import requests
import sys
from html.parser import HTMLParser

class GoogleDriveWarningParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.form_action = None
        self.inputs = {}

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        if tag == 'form' and attrs_dict.get('id') == 'download-form':
            self.form_action = attrs_dict.get('action')
        elif tag == 'input' and attrs_dict.get('type') == 'hidden':
            name = attrs_dict.get('name')
            value = attrs_dict.get('value')
            if name:
                self.inputs[name] = value

def download_file_from_google_drive(file_id, destination):
    print(f"Starting download for file ID: {file_id} to {destination}")
    url = "https://docs.google.com/uc?export=download"
    session = requests.Session()
    
    # First request to get warning page
    response = session.get(url, params={'id': file_id})
    html_content = response.text
    
    if "Virus scan warning" in html_content or "can't scan this file for viruses" in html_content:
        print("Detected Google Drive virus warning page. Parsing form...")
        parser = GoogleDriveWarningParser()
        parser.feed(html_content)
        
        if parser.form_action and parser.inputs:
            print(f"Submitting form to: {parser.form_action} with inputs: {parser.inputs}")
            response = session.get(parser.form_action, params=parser.inputs, stream=True)
        else:
            print("Failed to parse warning form. Retrying directly with confirm=t...")
            response = session.get(url, params={'id': file_id, 'confirm': 't'}, stream=True)
    else:
        print("No virus scan warning page detected. Downloading directly...")
        response = session.get(url, params={'id': file_id}, stream=True)
        
    save_response_content(response, destination)

def save_response_content(response, destination):
    chunk_size = 1024 * 1024  # 1MB chunks
    downloaded_size = 0
    with open(destination, "wb") as f:
        for chunk in response.iter_content(chunk_size):
            if chunk:
                f.write(chunk)
                downloaded_size += len(chunk)
                print(f"Downloaded: {downloaded_size / (1024*1024):.2f} MB", end="\r")
    print()
    if downloaded_size < 100000:
        print("Warning: The downloaded file is very small. It might not be the correct weights file.")
    else:
        print(f"Download finished successfully. File size: {downloaded_size / (1024*1024):.2f} MB")

if __name__ == "__main__":
    file_id = "1gRB7ez1e4H7a9Y09lLqRuna0luZO5VRK"
    destination = "model_best_val_loss_var.pkl"
    download_file_from_google_drive(file_id, destination)
