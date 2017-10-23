FROM node:7.10

RUN cd /tmp; wget https://support.hdfgroup.org/ftp/HDF5/releases/hdf5-1.10/hdf5-1.10.0-patch1/src/hdf5-1.10.0-patch1.tar.gz
RUN cd /tmp; tar xvzf hdf5-1.10.0-patch1.tar.gz
RUN cd /tmp/hdf5-1.10.0-patch1; ./configure --prefix=/usr/local --enable-cxx
RUN cd /tmp/hdf5-1.10.0-patch1; make
RUN cd /tmp/hdf5-1.10.0-patch1; make install

WORKDIR /app

RUN yarn global add typescript node-gyp

COPY . .

RUN yarn install

RUN tsc

CMD ["./start.sh"]

EXPOSE  9661
