#!/bin/sh
printf '\n# resolve registered protocol: `s3:`\n\n';
http localhost:3000/resolve?url=s3://test --verbose --pretty format;
printf '\n\n# resolve standard protocol: `https:`\n\n';
http localhost:3000/resolve?url=https://google.com --verbose --pretty format;
printf '\n\n# resolve unknown protocol: `gdrive:`\n\n';
http localhost:3000/resolve?url=gdrive://test --verbose --pretty format;
