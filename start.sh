
cd "$(dirname "$0")"
SCRIPT_DIR="$(pwd)"
echo $SCRIPT_DIR
rm $SCRIPT_DIR/debug.log
rm -r $SCRIPT_DIR/rec
mkdir $SCRIPT_DIR/rec
node $SCRIPT_DIR/unidenServer.js > $SCRIPT_DIR/debug.log