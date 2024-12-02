import subprocess
import json
import os

def run_nodejs_code_in_realtime(temp_file, language):
        # Load JSON from a file
        current_dir = os.path.dirname(os.path.abspath(__file__))
        config_path = os.path.join(current_dir, 'config.json')
        with open(config_path, 'r') as file:
             data = json.load(file)

        command = data[language]
        # Run the Node.js code using the `node` command
        process = subprocess.Popen(
            [command, temp_file],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        # Read the output and error streams in real time
        for line in process.stdout:
            print(line, end="")  # Print each line as it is generated

        # Wait for the process to finish and capture any remaining error output
        process.wait()
        if process.returncode != 0:
            print("\nError:")
            for line in process.stderr:
                print(line, end="")  # Print error messages if any

        return process.returncode

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        temp_file = sys.argv[1]
        language = sys.argv[2]
        exit_code = run_nodejs_code_in_realtime(temp_file, language)
    else:
        print("No code provided")
