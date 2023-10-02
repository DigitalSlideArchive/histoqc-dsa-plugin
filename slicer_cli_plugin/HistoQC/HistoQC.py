from ctk_cli import CLIArgumentParser
import girder_client
import os
import tempfile
import logging
import subprocess
import shutil
import large_image
import large_image_converter
import large_image_source_openslide
import tifftools

if __name__ != '__main__': quit()

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s.%(msecs)03d %(levelname)s %(module)s - %(funcName)s: %(message)s',
                    datefmt='%Y-%m-%d %H:%M:%S')

args = CLIArgumentParser().parse_args()
logging.info(f'{args = }')

girder = girder_client.GirderClient(apiUrl=args.girderApiUrl)
girder.setToken(args.girderToken)

conf = open('/opt/HistoQC/histoqc/config/config.ini').read()
conf = conf.replace('confirm_base_mag: False', 'confirm_base_mag: False\nbase_mag: 20')
conf = open('/opt/HistoQC/histoqc/config/config.ini', 'w').write(conf)


input_dir = args.inputDir
logging.info(f'{input_dir = }')
logging.info('{os.listdir(input_dir) = ' + repr(os.listdir(input_dir)) + '}')
# flatten transcoded files
for entry in os.listdir(input_dir):
    path = os.path.join(input_dir, entry)
    if os.path.isdir(path) and os.path.isfile(os.path.join(path, entry)):
        if len(os.listdir(path)) == 2:
            other = os.path.join(path, [name for name in os.listdir(path) if name != entry][0])
            logging.info(f'Move {other} to {path}')
            shutil.move(other, path + '.tmp')
            shutil.rmtree(path)
            shutil.move(path + '.tmp', path)
    ts = tso = None
    try:
        logging.info(f'Checking if {entry} can be opened via large_image')
        ts = large_image.open(path)
        logging.info(f'Checking if {entry} can be opened via large_image_source_openslide')
        tso = large_image_source_openslide.open(path)
    except Exception:
        pass
    if ts is None:
        logging.info(f'Cannot use {entry}')
        shutil.rmtree(path)
        continue
    if tso is None:
        # convert files that openslide.lowlevel won't read
        logging.info(f'Converting {entry} to svs')
        try:
            large_image_converter.convert(path, path + '.tmp', onlyFrame=0)
            shutil.move(path + '.tmp', path)
            tso = large_image_source_openslide.open(path)
        except Exception:
            continue
    """
    if not tso.metadata.get('magnfication'):
        logging.info(f'Adding magnfication to {entry}')
        # add magnfication to anything that doesn't have it
        info = tifftools.read_tiff(path)
        info['ifds'][0]['tags'][int(tifftools.Tag.ResolutionUnit)] = {
            'data': [tifftools.constants.ResolutionUnit.Centimeter],
            'datatype': tifftools.constants.Datatype.SHORT}
        info['ifds'][0]['tags'][int(tifftools.Tag.XResolution)] = {
            'data': [20000, 1],
            'datatype': tifftools.constants.Datatype.RATIONAL}
        info['ifds'][0]['tags'][int(tifftools.Tag.YResolution)] = {
            'data': [20000, 1],
            'datatype': tifftools.constants.Datatype.RATIONAL}
        tifftools.write_tiff(info, path + '.tmp', allowExisting=True)
        shutil.move(path + '.tmp', path)
    """

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

    logging.info('{os.listdir(tmp_output_dir) = ' + repr(os.listdir(tmp_output_dir)) + '}')

    girder.upload(
        filePattern = f'{tmp_output_dir}/*',
        parentId = output_folder['_id'],
        parentType = 'folder'
    )

logging.info('HistoQC script finished running.')
