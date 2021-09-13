import org.apache.camel.builder.RouteBuilder;
import org.apache.camel.main.Main;

public class MyRouteBuilder extends RouteBuilder {

    @Override
    public void configure() throws Exception {
        from("timer:foo?period=5000")
            .to("atlasmap:fake-in-src-main-resources.adm");
    }

}
