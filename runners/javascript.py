import subprocess
import argparse
import json
import sys
import threading

def execute_js(code_file, language):
    # Load the command configuration
    with open('./runners/config.json', 'r') as file:
        data = json.load(file)

    command = data.get(language)
    if not command:
        print(f"Language {language} is not supported.", flush=True)
        return

    # Start the subprocess
    process = subprocess.Popen(
        [command, code_file],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )

    # Timer to enforce a 15-second timeout
    def terminate_process():
        if process.poll() is None:  # Check if process is still running
            process.terminate()
            print("Execution timed out after 15 seconds.", flush=True)

    timer = threading.Timer(15, terminate_process)
    timer.start()

    try:
        # Read real-time output
        while True:
            output = process.stdout.readline()
            if output == '' and process.poll() is not None:
                break
            if output:
                print(f"{output.strip()}", flush=True)

        # Capture any error messages
        stderr_output = process.stderr.read()
        if stderr_output:
            print(f"{stderr_output.strip()}", flush=True)

    finally:
        # Ensure the timer is canceled if the process finishes in time
        timer.cancel()

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
