from ctk_cli import CLIArgumentParser
import girder_client
import os
import tempfile
import logging
import subprocess

if __name__ != '__main__': quit()

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s.%(msecs)03d %(levelname)s %(module)s - %(funcName)s: %(message)s',
                    datefmt='%Y-%m-%d %H:%M:%S')

args = CLIArgumentParser().parse_args()
logging.info(f'{args = }')

girder = girder_client.GirderClient(apiUrl=args.girderApiUrl)
girder.setToken(args.girderToken)

input_dir = args.inputDir
logging.info(f'{input_dir = }')
logging.info('{os.listdir(input_dir) = ' + repr(os.listdir(input_dir)) + '}')

# by convention, it appears that the folder id is name of the parent directory - there is probably a better way to directly pass that in from the slicer cli
folder_id = os.path.basename(os.path.dirname(input_dir))
logging.info(f'{folder_id = }')

output_folder = girder.createFolder(
    name = 'histoqc_outputs',
    parentId = folder_id,
    parentType = 'folder'
)

# we will remember which directory we're currently in and only temporarily move into the histoqc directory for running it
histoqc_dir = '/opt/HistoQC'
current_dir = os.getcwd()

with tempfile.TemporaryDirectory() as tmp_output_dir:

    os.chdir(histoqc_dir)

    histoqc_output = subprocess.check_output([
        "python3", "-m", "histoqc",
        '-o', tmp_output_dir,
        f'{input_dir}/*'
    ])

    os.chdir(current_dir)

    logging.info('{os.listdir(tmp_output_dir) = ' + os.listdir(tmp_output_dir) + '}')

    girder.upload(
        filePattern = f'{tmp_output_dir}/*',
        parentId = output_folder['_id'],
        parentType = 'folder'
    )

logging.info('HistoQC script finished running.')
