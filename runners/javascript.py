import subprocess
import argparse
import json
import sys

def execute_js(code_file, language):
    # Print the language argument

    with open('./runners/config.json', 'r') as file:
        data = json.load(file)

    command = data.get(language)
    if not command:
        print(f"Language {language} is not supported.", flush=True)
        return

    # Run the code file using the specified command
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
            print("", flush=True)
            break
        if output:
            print(f"{output.strip()}", flush=True)

    # Capture any error messages
    stderr_output = process.stderr.read()
    if stderr_output:
        print(f"{stderr_output.strip()}", flush=True)

def main():
    # Set up argument parsing
    parser = argparse.ArgumentParser(description='Execute a code file and print real-time output.')

    # First argument: Code file (positional)
    parser.add_argument('code_file', type=str, help='The path to the code file')

    # Second argument: Language (positional)
    parser.add_argument('language', type=str, help='The language in which the script is written')

    # Parse arguments
    args = parser.parse_args()

    # Execute the code file
    execute_js(args.code_file, args.language)

if __name__ == "__main__":
    main()
