# Web Application for KMS

This is object detection web application for KMS.

### System architecture

<img src="https://raw.githubusercontent.com/BradXiao/kurento-ap/main/architecture.png" width="600">

### Screenshots

<img src="https://raw.githubusercontent.com/BradXiao/kurento-ap/main/screenshot.jpg" width="600">


## Prerequites

- [Kurento Media Server](https://github.com/BradXiao/kurento-ubuntu) installed
- [AI (object detection) module for KMS](https://github.com/BradXiao/kurento-module) installed
- STUN/TURN server (optional)

## Usage

#### Parameters configuration

The following shows a part of paramters in `application.properties`.  You will need to modify them before running. Replace `[...]` with the correct IP or data.

The metadata infomation for all the paramters is included in the project.

```ini
...

server.port=8080

kms.url=ws://[Kurento Media Server IP]:8888/kurento

turn1.internal.sever=[your turn server inernel IP]:3478?transport=udp
turn1.server=[your turn server public IP]:3478?transport=udp
turn1.name=Relay Server 1

turn.static-auth-secret=[coturn static-auth-secret]

...
```

### Tomcat
To modify the necessary parameters, you can either:
- Update `application.properties` in the war file
- Clone this repo, modify `application.properties` and build it

> [!NOTE]
> The war file embedded a self-signed SSL certificate. You will need to prepare one on your own.

### Test
The project is targeted to deploy on Tomcat, but you can run it directly:

```bash
java -jar objectdetection.war \
    --catalina.home=. \
    --kms.url=ws://[Kurento Media Server IP]:8888/kurento
```
Replace `[Kurento Media Server IP]` with real IP.


## Disclaimer

THIS SOFTWARE IS PROVIDED "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

