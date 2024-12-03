import subprocess
import argparse
import json

def execute_js(code_file, language):
    # Print the language argument
    print(f"Running script in {language} language...")

    with open('./runners/config.json', 'r') as file:
        data = json.load(file)

    command = data[language]
    # Run the JavaScript file using Node.js
    process = subprocess.Popen(
        [command, code_file],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )

    # Read real-time output
    while True:
        output = process.stdout.readline()
        if output == '' and process.poll() is not None:
            print("Proess completed.")
            break
        if output:
            print(f"Output: {output.strip()}")

    # Capture any error messages
    stderr_output = process.stderr.read()
    if stderr_output:
        print(f"Error: {stderr_output.strip()}")

def main():
    # Set up argument parsing
    parser = argparse.ArgumentParser(description='Execute a JavaScript file and print real-time output.')
    
    # First argument: JS file (positional)
    parser.add_argument('code_file', type=str, help='The path to the code file')
    
    # Second argument: language (positional)
    parser.add_argument('language', type=str, help='The language in which the script is written')

    # Parse arguments
    args = parser.parse_args()

    # Execute the JavaScript file
    execute_js(args.code_file, args.language)

if __name__ == "__main__":
    main()
